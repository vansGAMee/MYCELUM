import assert from 'node:assert/strict';
import test from 'node:test';
import type { BaseRoomConfig, MessageAction, Room } from '@trystero-p2p/core';
import type { joinRoom } from 'trystero/nostr';
import { GameEngine } from '../game/engine';
import { MultiplayerManager } from '../game/multiplayer';
import { buildStaticTurnConfig, parseIceServers, prioritizeRelayIceServers, resolveTurnConfiguration, type ResolvedTurnConfiguration } from '../game/turn';

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

function controlledTransport() {
  const configs: BaseRoomConfig[] = [];
  const callbacks: Array<NonNullable<Parameters<typeof joinRoom>[2]>> = [];
  let leaveCount = 0;
  const joinTransport = ((config: BaseRoomConfig, _roomId: string, roomCallbacks?: Parameters<typeof joinRoom>[2]) => {
    configs.push(config);
    callbacks.push(roomCallbacks ?? {});
    return mockRoom(() => { leaveCount++; });
  }) as typeof joinRoom;
  return { configs, callbacks, joinTransport, get leaveCount() { return leaveCount; } };
}

async function flushAsyncTransport() {
  await Promise.resolve();
  await new Promise<void>((resolve) => setImmediate(resolve));
}

const METERED_ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.relay.metered.ca:80' },
  { urls: 'turn:global.relay.metered.ca:80', username: 'user', credential: 'pass' },
  { urls: 'turn:global.relay.metered.ca:80?transport=tcp', username: 'user', credential: 'pass' },
  { urls: 'turn:global.relay.metered.ca:443', username: 'user', credential: 'pass' },
  { urls: 'turns:global.relay.metered.ca:443?transport=tcp', username: 'user', credential: 'pass' },
];

const SDP_ERROR = 'could not connect to peer peer-1 after exchanging SDP; check that your TURN server URLs and credentials are reachable by both peers';

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

test('normal direct attempt keeps policy all and does not retry', async () => {
  const transport = controlledTransport();
  const manager = new MultiplayerManager({
    joinTransport: transport.joinTransport,
    resolveTurn: async () => ({ mode: 'rtc', iceServers: METERED_ICE_SERVERS }),
  });
  manager.hostRoom('DIRECT', 'cyan');
  await flushAsyncTransport();

  assert.equal(transport.configs.length, 1);
  assert.equal(transport.configs[0].rtcConfig?.iceTransportPolicy, undefined);
  assert.deepEqual(transport.configs[0].rtcConfig?.iceServers, METERED_ICE_SERVERS);
  manager.leave();
});

test('SDP failure closes direct room and performs exactly one relay-only retry', async () => {
  const transport = controlledTransport();
  const events: Array<{ event: string; data?: unknown }> = [];
  const manager = new MultiplayerManager({
    joinTransport: transport.joinTransport,
    resolveTurn: async () => ({ mode: 'rtc', iceServers: METERED_ICE_SERVERS }),
  });
  manager.subscribe((event, data) => events.push({ event, data }));
  manager.hostRoom('RELAY1', 'cyan');
  await flushAsyncTransport();
  transport.callbacks[0].onJoinError?.({ appId: 'mycelium-v3', roomId: 'RELAY1', peerId: 'peer-1', error: SDP_ERROR });
  await flushAsyncTransport();

  assert.equal(transport.leaveCount, 1);
  assert.equal(transport.configs.length, 2);
  assert.equal(transport.configs[1].rtcConfig?.iceTransportPolicy, 'relay');
  assert.ok(events.some(({ event, data }) => event === 'waiting' && typeof data === 'object' && data !== null && 'message' in data && String(data.message).includes('защищённый TURN-маршрут')));
  assert.equal(events.some(({ event }) => event === 'error'), false);

  transport.callbacks[1].onJoinError?.({ appId: 'mycelium-v3', roomId: 'RELAY1', peerId: 'peer-1', error: SDP_ERROR });
  await flushAsyncTransport();
  assert.equal(transport.configs.length, 2);
  assert.ok(events.some(({ event, data }) => event === 'error' && data === 'Не удалось установить соединение даже через TURN. VPN или сеть блокирует WebRTC/TURN.'));
  manager.leave();
});

test('relay-only ICE list prioritizes TLS TCP 443 and excludes STUN', () => {
  const relay = prioritizeRelayIceServers(METERED_ICE_SERVERS);
  assert.deepEqual(relay.map((server) => server.urls), [
    'turns:global.relay.metered.ca:443?transport=tcp',
    'turn:global.relay.metered.ca:443',
    'turn:global.relay.metered.ca:80?transport=tcp',
    'turn:global.relay.metered.ca:80',
  ]);
});

test('first colony to capture the pickup receives one bomb charge', () => {
  const manager = new MultiplayerManager();
  const game = new GameEngine('cyan', 27);
  game.multiplayerMode = true;
  game.suppressAi = true;
  const pickupCell = game.world.getCell(2, 0);
  pickupCell.naturalSpeciesId = 'cyan';
  pickupCell.currentSpeciesId = 'cyan';
  pickupCell.claimed = false;
  pickupCell.revealed = false;
  game.duelPickup = { type: 'sporeBomb', x: 2, y: 0, spawnedRound: 1 };
  manager.engine = game;
  manager.isHost = true;
  manager.isConnected = true;
  manager.activePlayer = 'host';

  assert.equal(manager.performAction(2, 0, 'reveal'), true);
  assert.equal(game.duelPickup, null);
  assert.equal(game.duelBombCharges, 1);
});

test('rare bonus turn can occur but never chains into a third turn', () => {
  let selected: { manager: MultiplayerManager; game: GameEngine } | undefined;
  for (let seed = 1; seed <= 200 && !selected; seed++) {
    const manager = new MultiplayerManager();
    const game = new GameEngine('cyan', seed);
    game.multiplayerMode = true;
    game.suppressAi = true;
    const first = game.world.getCell(2, 0);
    first.naturalSpeciesId = 'cyan';
    first.currentSpeciesId = 'cyan';
    manager.engine = game;
    manager.isHost = true;
    manager.isConnected = true;
    manager.activePlayer = 'host';
    const accepted = manager.performAction(2, 0, 'reveal');
    if (accepted && manager.bonusTurnFor === 'host') selected = { manager, game };
  }
  assert.ok(selected, 'expected at least one deterministic 8% bonus within 200 seeds');
  const second = selected.game.world.getCell(3, 0);
  second.naturalSpeciesId = 'cyan';
  second.currentSpeciesId = 'cyan';
  assert.equal(selected.manager.performAction(3, 0, 'reveal'), true);
  assert.equal(selected.manager.activePlayer, 'guest');
  assert.equal(selected.manager.bonusTurnFor, undefined);
});
