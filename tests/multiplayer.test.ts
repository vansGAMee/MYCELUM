import assert from 'node:assert/strict';
import test from 'node:test';
import type { BaseRoomConfig, MessageAction, Room } from '@trystero-p2p/core';
import type { joinRoom } from 'trystero/nostr';
import { MultiplayerManager } from '../game/multiplayer';
import { buildStaticTurnConfig, parseIceServers, resolveTurnConfiguration, type ResolvedTurnConfiguration } from '../game/turn';

function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((done) => { resolve = done; });
  return { promise, resolve };
}

function mockRoom(onLeave?: () => void): Room {
  const makeAction = (): MessageAction => ({
    send: async () => undefined,
    onMessage: null,
    onReceiveProgress: null,
  });
  return {
    makeAction,
    leave: async () => { onLeave?.(); },
    onPeerJoin: null,
    onPeerLeave: null,
  } as unknown as Room;
}

test('parses Metered array and wrapped iceServers responses', () => {
  const array = parseIceServers([
    { urls: 'stun:stun.example.test:3478' },
    { urls: ['turn:relay.example.test:443', 'https://ignored.example.test'], username: 'user', credential: 'pass' },
  ]);
  assert.deepEqual(array, [
    { urls: 'stun:stun.example.test:3478' },
    { urls: ['turn:relay.example.test:443'], username: 'user', credential: 'pass' },
  ]);
  assert.deepEqual(parseIceServers({ iceServers: array }), array);
});

test('builds static TURN only when URL, username, and credential are complete', () => {
  assert.equal(buildStaticTurnConfig({ turnUrl: 'turns:relay.example.test:443', turnUsername: 'user' }), null);
  assert.deepEqual(buildStaticTurnConfig({
    turnUrl: 'turn:relay.example.test:80, turns:relay.example.test:443?transport=tcp',
    turnUsername: 'user',
    turnCredential: 'pass',
  }), [{
    urls: ['turn:relay.example.test:80', 'turns:relay.example.test:443?transport=tcp'],
    username: 'user',
    credential: 'pass',
  }]);
});

test('missing TURN configuration keeps direct P2P and does not fetch', async () => {
  let fetched = false;
  const result = await resolveTurnConfiguration({}, async () => {
    fetched = true;
    throw new Error('must not run');
  });
  assert.deepEqual(result, { mode: 'none', warning: undefined });
  assert.equal(fetched, false);
});

test('credential fetch failure falls back without throwing', async () => {
  const result = await resolveTurnConfiguration(
    { credentialsUrl: 'https://turn.example.test/credentials' },
    async () => { throw new Error('offline'); },
  );
  assert.equal(result.mode, 'none');
  assert.match(result.warning ?? '', /offline/);
});

test('complete credential response becomes rtcConfig iceServers', async () => {
  const result = await resolveTurnConfiguration(
    { credentialsUrl: 'https://turn.example.test/credentials' },
    async () => new Response(JSON.stringify([
      { urls: 'stun:stun.example.test:3478' },
      { urls: 'turns:relay.example.test:443', username: 'user', credential: 'pass' },
    ]), { status: 200 }),
  );
  assert.equal(result.mode, 'rtc');
  if (result.mode === 'rtc') assert.equal(result.iceServers.length, 2);
});

test('a second room start invalidates initialization still waiting for TURN', async () => {
  const pending: ReturnType<typeof deferred<ResolvedTurnConfiguration>>[] = [];
  const joinedRooms: string[] = [];
  const joinTransport = ((_config: unknown, roomId: string) => {
    joinedRooms.push(roomId);
    return mockRoom();
  }) as typeof joinRoom;
  const manager = new MultiplayerManager({
    joinTransport,
    resolveTurn: () => {
      const request = deferred<ResolvedTurnConfiguration>();
      pending.push(request);
      return request.promise;
    },
  });

  manager.hostRoom('FIRST', 'cyan');
  manager.hostRoom('SECOND', 'coral');
  assert.equal(pending.length, 2);

  pending[1].resolve({ mode: 'none' });
  await Promise.resolve();
  await Promise.resolve();
  pending[0].resolve({ mode: 'none' });
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(joinedRooms, ['SECOND']);
  manager.leave();
});

test('resolved Metered servers are passed to Trystero rtcConfig', async () => {
  let receivedConfig: BaseRoomConfig | undefined;
  const iceServers: RTCIceServer[] = [
    { urls: 'stun:stun.example.test:3478' },
    { urls: 'turns:relay.example.test:443', username: 'user', credential: 'pass' },
  ];
  const manager = new MultiplayerManager({
    joinTransport: ((config: BaseRoomConfig) => {
      receivedConfig = config;
      return mockRoom();
    }) as typeof joinRoom,
    resolveTurn: async () => ({ mode: 'rtc', iceServers }),
  });

  manager.hostRoom('TURN1', 'cyan');
  await Promise.resolve();
  await Promise.resolve();

  assert.deepEqual(receivedConfig?.rtcConfig?.iceServers, iceServers);
  assert.equal(receivedConfig?.appId, 'mycelium-v3');
  manager.leave();
});
