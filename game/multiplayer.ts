import { joinRoom } from 'trystero/nostr';
import type { BaseRoomConfig, DataPayload, MessageAction, Room } from '@trystero-p2p/core';
import { GAME_CONFIG, type SpeciesId } from './config';
import { GameEngine } from './engine';
import { hasPublicTurnConfiguration, listIceServerUrls, relayIceServersFromTurnConfiguration, resolveTurnConfiguration, type ResolvedTurnConfiguration } from './turn';
import type { ActionResult, CellKey, DuelPickup, EnemyIntent, GameAnimEvent, SecondaryTrait, SquareMatch, Strain, WorldEvent } from './types';

export type MpActionType = 'reveal' | 'attack' | 'repaint' | 'inspect';
export type PlayerRole = 'host' | 'guest';
export type MultiplayerStatus = 'idle' | 'waiting' | 'connecting' | 'connected' | 'your_turn' | 'opponent_turn' | 'disconnected' | 'error';
type IceAttempt = 'direct' | 'relay';

interface WireMessage { [key: string]: unknown }

export interface MpActionMessage extends WireMessage {
  id: string;
  type: MpActionType;
  x: number;
  y: number;
  role: PlayerRole;
  revision: number;
  useBomb?: boolean;
}

interface SyncedCell extends WireMessage {
  x: number;
  y: number;
  naturalSpecies: SpeciesId;
  species: SpeciesId;
  claimed: boolean;
  revealed: boolean;
  reinforcement: number;
  isCore?: boolean;
  strainId?: string;
  isSnapHidden?: boolean;
  obscuredUntilTurn?: number;
  blockedUntilTurn?: number;
  dormantUntilTurn?: number;
}

interface PlayerResources extends WireMessage {
  repaintCharges: number;
  maxTerritory: number;
  enemiesCaptured: number;
  bombCharges: number;
}

export interface DuelMove extends WireMessage {
  id: string;
  role: PlayerRole;
  type: MpActionType;
  target: CellKey;
  accepted: boolean;
  title: string;
  detail: string;
}

export interface MpStateSyncMessage extends WireMessage {
  revision: number;
  round: number;
  turn: number;
  activePlayer: PlayerRole;
  cells: SyncedCell[];
  hostResources: PlayerResources;
  guestResources: PlayerResources;
  strains: Strain[];
  lastEvent: WorldEvent | null;
  lastSquares: SquareMatch[];
  animEvents: GameAnimEvent[];
  activeIntents: EnemyIntent[];
  roundResult: ActionResult | null;
  lastMove?: DuelMove;
  winner?: PlayerRole;
  pickup: DuelPickup | null;
  bonusTurnFor?: PlayerRole;
}

export interface MpInitMessage extends WireMessage {
  seed: number;
  hostSpecies: SpeciesId;
  guestSpecies: SpeciesId;
  hostCore: [number, number];
  guestCore: [number, number];
  revision: number;
  selectionNote?: string;
}

interface GuestHello extends WireMessage { species: SpeciesId }
interface ReadyMessage extends WireMessage { ready: true }

export type MpCallback = (event: 'waiting' | 'connected' | 'sync' | 'rejected' | 'disconnected' | 'error', data?: unknown) => void;

export interface MultiplayerDependencies {
  joinTransport?: typeof joinRoom;
  resolveTurn?: () => Promise<ResolvedTurnConfiguration>;
}

export class MultiplayerManager {
  public isHost = false;
  public roomCode = '';
  public isConnected = false;
  public hostSpecies: SpeciesId = 'cyan';
  public guestSpecies: SpeciesId = 'coral';
  public engine: GameEngine | null = null;
  public activePlayer: PlayerRole = 'host';
  public winner: PlayerRole | undefined;
  public round = 1;
  public revision = 0;
  public pendingAction = false;
  public lastMove: DuelMove | undefined;
  public connectionNote: string | undefined;
  public bonusTurnFor: PlayerRole | undefined;

  private room: Room | null = null;
  private channel: BroadcastChannel | null = null;
  private opponentPeerId: string | null = null;
  private action?: MessageAction;
  private sync?: MessageAction;
  private init?: MessageAction;
  private hello?: MessageAction;
  private ready?: MessageAction;
  private listeners = new Set<MpCallback>();
  private seenActions = new Set<string>();
  private lastAppliedRevision = -1;
  private syncedKeys = new Set<CellKey>();
  private hostResources: PlayerResources = { repaintCharges: 2, maxTerritory: 9, enemiesCaptured: 0, bombCharges: 0 };
  private guestResources: PlayerResources = { repaintCharges: 2, maxTerritory: 9, enemiesCaptured: 0, bombCharges: 0 };
  private transportAttempt = 0;
  private relayRetryUsed = false;
  private readonly joinTransport: typeof joinRoom;
  private readonly resolveTurn: () => Promise<ResolvedTurnConfiguration>;

  public constructor(dependencies: MultiplayerDependencies = {}) {
    this.joinTransport = dependencies.joinTransport ?? joinRoom;
    this.resolveTurn = dependencies.resolveTurn ?? (() => resolveTurnConfiguration());
  }

  public subscribe(callback: MpCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(event: Parameters<MpCallback>[0], data?: unknown) {
    for (const listener of this.listeners) listener(event, data);
  }

  public getRole(): PlayerRole { return this.isHost ? 'host' : 'guest'; }
  public isMyTurn(): boolean { return this.isConnected && this.activePlayer === this.getRole() && !this.pendingAction && !this.winner; }

  public hostRoom(code: string, species: SpeciesId) {
    const attempt = this.resetSession();
    this.isHost = true;
    this.roomCode = code.trim().toUpperCase();
    this.hostSpecies = species;
    this.notify('waiting', { roomCode: this.roomCode, message: this.initialConnectionMessage() });
    void this.initializeTransport(attempt);
  }

  public joinRoom(code: string, species: SpeciesId) {
    const attempt = this.resetSession();
    this.isHost = false;
    this.roomCode = code.trim().toUpperCase();
    this.guestSpecies = species;
    this.notify('waiting', { roomCode: this.roomCode, message: this.initialConnectionMessage() });
    void this.initializeTransport(attempt);
  }

  private resetSession(): number {
    this.closeTransport();
    const attempt = ++this.transportAttempt;
    this.winner = undefined;
    this.round = 1;
    this.revision = 0;
    this.pendingAction = false;
    this.lastMove = undefined;
    this.connectionNote = undefined;
    this.bonusTurnFor = undefined;
    this.relayRetryUsed = false;
    this.seenActions.clear();
    this.lastAppliedRevision = -1;
    this.syncedKeys.clear();
    this.isConnected = false;
    this.opponentPeerId = null;
    this.engine = null;
    this.hostResources = { repaintCharges: 2, maxTerritory: 9, enemiesCaptured: 0, bombCharges: 0 };
    this.guestResources = { repaintCharges: 2, maxTerritory: 9, enemiesCaptured: 0, bombCharges: 0 };
    return attempt;
  }

  private initialConnectionMessage(): string {
    return hasPublicTurnConfiguration()
      ? 'Проверяем резервное соединение через TURN…'
      : 'Настраиваем прямое P2P-соединение…';
  }

  private waitingMessage(turn: ResolvedTurnConfiguration): string {
    if (turn.mode !== 'none') return this.isHost
      ? 'Резервный маршрут TURN готов. Ожидаем соперника…'
      : 'TURN готов. Ищем безопасный маршрут к хозяину…';
    return this.isHost
      ? 'Комната создана. Ожидаем соперника по прямому P2P-соединению…'
      : 'Пробуем прямое P2P-соединение с хозяином…';
  }

  private async initializeTransport(attempt: number) {
    if (!this.roomCode) { this.notify('error', 'Укажите код комнаты.'); return; }
    let turn: ResolvedTurnConfiguration;
    try {
      turn = await this.resolveTurn();
    } catch (error) {
      console.warn('[MYCELIUM multiplayer] TURN initialization failed; continuing with direct P2P', error);
      turn = { mode: 'none' };
    }
    if (attempt !== this.transportAttempt) return;
    if (turn.warning) console.warn('[MYCELIUM multiplayer]', turn.warning);

    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`mycelium:${this.roomCode}`);
      this.channel.onmessage = ({ data }) => this.handleLocal(data as { kind: string; data?: WireMessage });
    }
    try {
      this.openTransportRoom(attempt, turn, 'direct');
      this.notify('waiting', { roomCode: this.roomCode, message: this.waitingMessage(turn) });
      if (!this.isHost) this.sendHello();
    } catch (error) {
      console.error('[MYCELIUM multiplayer] Transport initialization failed', error);
      this.closeTransport();
      this.notify('error', 'Не удалось запустить сетевое соединение. Закройте комнату и попробуйте ещё раз.');
    }
  }

  private getAttemptConfiguration(turn: ResolvedTurnConfiguration, iceAttempt: IceAttempt): { roomConfig: BaseRoomConfig; iceUrls: string[]; iceTransportPolicy: 'all' | 'relay' } {
    const roomConfig: BaseRoomConfig = { appId: 'mycelium-v3' };
    if (iceAttempt === 'relay') {
      const iceServers = relayIceServersFromTurnConfiguration(turn);
      roomConfig.rtcConfig = { iceServers, iceTransportPolicy: 'relay' };
      return { roomConfig, iceUrls: listIceServerUrls(iceServers), iceTransportPolicy: 'relay' };
    }
    if (turn.mode === 'rtc') roomConfig.rtcConfig = { iceServers: turn.iceServers };
    if (turn.mode === 'turn') roomConfig.turnConfig = turn.turnServers;
    const directServers = turn.mode === 'rtc' ? turn.iceServers : relayIceServersFromTurnConfiguration(turn);
    return { roomConfig, iceUrls: listIceServerUrls(directServers), iceTransportPolicy: 'all' };
  }

  private openTransportRoom(attempt: number, turn: ResolvedTurnConfiguration, iceAttempt: IceAttempt) {
    const { roomConfig, iceUrls, iceTransportPolicy } = this.getAttemptConfiguration(turn, iceAttempt);
    if (iceAttempt === 'relay' && iceUrls.length === 0) {
      this.notify('error', 'Не удалось установить соединение даже через TURN. VPN или сеть блокирует WebRTC/TURN.');
      return;
    }
    console.info('[MYCELIUM multiplayer] ICE connection attempt', { attempt: iceAttempt, iceTransportPolicy, iceUrls });
    const room = this.joinTransport(roomConfig, this.roomCode, {
      onJoinError: ({ error, peerId }) => {
        if (attempt !== this.transportAttempt || this.room !== room) return;
        console.warn('[MYCELIUM multiplayer] onJoinError', { attempt: iceAttempt, iceTransportPolicy, iceUrls, peerId, onJoinError: error });
        if (this.isConnected) return;
        const failedAfterSdp = /after exchanging sdp/i.test(error);
        if (iceAttempt === 'direct' && failedAfterSdp && !this.relayRetryUsed && relayIceServersFromTurnConfiguration(turn).length > 0) {
          this.relayRetryUsed = true;
          this.notify('waiting', { roomCode: this.roomCode, message: 'Прямое соединение недоступно. Подключаемся через защищённый TURN-маршрут…' });
          void this.retryWithRelay(attempt, turn, room);
          return;
        }
        this.notify('error', iceAttempt === 'relay'
          ? 'Не удалось установить соединение даже через TURN. VPN или сеть блокирует WebRTC/TURN.'
          : 'Не удалось установить сетевое соединение. Попробуйте создать комнату заново.');
      },
    });
    this.room = room;
    const isCurrentRoom = () => attempt === this.transportAttempt && this.room === room;
    this.action = room.makeAction('action');
    this.sync = room.makeAction('sync');
    this.init = room.makeAction('init');
    this.hello = room.makeAction('hello');
    this.ready = room.makeAction('ready');
    room.onPeerJoin = (peerId) => {
      if (!isCurrentRoom() || (this.opponentPeerId && this.opponentPeerId !== peerId)) return;
      this.opponentPeerId = peerId;
      if (!this.isHost) this.sendHello();
    };
    room.onPeerLeave = (peerId) => {
      if (!isCurrentRoom() || peerId !== this.opponentPeerId) return;
      this.isConnected = false;
      this.pendingAction = false;
      this.notify('disconnected');
    };
    this.hello.onMessage = (payload, { peerId }) => {
      const data = payload as GuestHello;
      if (!isCurrentRoom() || !this.isHost || (this.opponentPeerId && peerId !== this.opponentPeerId)) return;
      this.opponentPeerId = peerId;
      this.guestSpecies = data.species === this.hostSpecies ? this.fallbackGuestSpecies() : data.species;
      if (data.species === this.hostSpecies) this.connectionNote = `Выбранное семейство занято · гость адаптирован к «${GAME_CONFIG.colors.species[this.guestSpecies].name}»`;
      this.createHostMatch();
    };
    this.init.onMessage = (payload, { peerId }) => {
      const data = payload as MpInitMessage;
      if (!isCurrentRoom() || this.isHost || (this.opponentPeerId && peerId !== this.opponentPeerId)) return;
      this.opponentPeerId = peerId;
      this.receiveInit(data);
    };
    this.ready.onMessage = (_data, { peerId }) => {
      if (!isCurrentRoom() || !this.isHost || peerId !== this.opponentPeerId) return;
      this.isConnected = true;
      this.notify('connected');
      this.broadcastState();
    };
    this.action.onMessage = (payload, { peerId }) => {
      const message = payload as MpActionMessage;
      if (!isCurrentRoom() || !this.isHost || peerId !== this.opponentPeerId) return;
      this.receiveAction(message);
    };
    this.sync.onMessage = (payload, { peerId }) => {
      const state = payload as MpStateSyncMessage;
      if (!isCurrentRoom() || this.isHost || peerId !== this.opponentPeerId) return;
      this.receiveSync(state);
    };
  }

  private async retryWithRelay(attempt: number, turn: ResolvedTurnConfiguration, failedRoom: Room) {
    await this.releaseRoomTransport(failedRoom);
    // BroadcastChannel can finish a same-device handshake while Trystero is
    // closing the failed direct room. Do not tear down a connection that won
    // that race.
    if (attempt !== this.transportAttempt || this.isConnected) return;
    this.opponentPeerId = null;
    this.engine = null;
    this.isConnected = false;
    this.pendingAction = false;
    this.lastAppliedRevision = -1;
    this.syncedKeys.clear();
    try {
      this.openTransportRoom(attempt, turn, 'relay');
      if (!this.isHost) this.sendHello();
    } catch (error) {
      console.error('[MYCELIUM multiplayer] Relay transport initialization failed', error);
      this.notify('error', 'Не удалось установить соединение даже через TURN. VPN или сеть блокирует WebRTC/TURN.');
    }
  }

  private releaseRoomTransport(expectedRoom = this.room): Promise<void> {
    if (!expectedRoom) return Promise.resolve();
    expectedRoom.onPeerJoin = null;
    expectedRoom.onPeerLeave = null;
    if (this.room !== expectedRoom) return expectedRoom.leave().catch((error) => console.warn('[MYCELIUM multiplayer] Stale room cleanup failed', error));
    if (this.action) this.action.onMessage = null;
    if (this.sync) this.sync.onMessage = null;
    if (this.init) this.init.onMessage = null;
    if (this.hello) this.hello.onMessage = null;
    if (this.ready) this.ready.onMessage = null;
    this.room = null;
    this.action = undefined;
    this.sync = undefined;
    this.init = undefined;
    this.hello = undefined;
    this.ready = undefined;
    return expectedRoom.leave().catch((error) => console.warn('[MYCELIUM multiplayer] Room cleanup failed', error));
  }

  private closeTransport() {
    this.channel?.close();
    this.channel = null;
    void this.releaseRoomTransport();
  }

  private fallbackGuestSpecies(): SpeciesId {
    return (['cyan', 'coral', 'yellow', 'magenta', 'violet'] as SpeciesId[]).find((id) => id !== this.hostSpecies) ?? 'coral';
  }

  private sendHello() {
    if (this.isHost) return;
    this.send(this.hello, { species: this.guestSpecies }, 'hello');
  }

  private send<T extends WireMessage>(action: MessageAction | undefined, data: T, localKind: string) {
    if (this.channel) this.channel.postMessage({ kind: localKind, data });
    if (this.opponentPeerId && action) action.send(data as unknown as DataPayload, { target: this.opponentPeerId }).catch(() => this.notify('error', 'Сообщение не доставлено. Пересоздайте комнату.'));
  }

  private createHostMatch() {
    if (!this.isHost || this.engine) return;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    this.engine = new GameEngine(this.hostSpecies, seed);
    this.engine.suppressAi = true;
    this.engine.multiplayerMode = true;
    this.engine.enemyCoreX = 12;
    this.engine.enemyCoreY = 12;
    for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) {
      const cell = this.engine.world.getCell(12 + dx, 12 + dy);
      cell.currentSpeciesId = this.guestSpecies;
      cell.naturalSpeciesId = this.guestSpecies;
      cell.claimed = true;
      cell.revealed = true;
      cell.reinforcement = dx === 0 && dy === 0 ? 3 : 1;
      if (this.guestSpecies === 'violet' && (dx !== 0 || dy !== 0)) cell.reinforcement = 2;
      cell.isCore = dx === 0 && dy === 0;
    }
    this.activePlayer = 'host';
    const init: MpInitMessage = { seed, hostSpecies: this.hostSpecies, guestSpecies: this.guestSpecies, hostCore: [0, 0], guestCore: [12, 12], revision: 0, selectionNote: this.connectionNote };
    this.send(this.init, init, 'init');
  }

  private receiveInit(data: MpInitMessage) {
    if (this.isHost || this.engine) return;
    this.hostSpecies = data.hostSpecies;
    this.guestSpecies = data.guestSpecies;
    this.connectionNote = data.selectionNote;
    this.engine = new GameEngine(this.guestSpecies, data.seed);
    this.engine.suppressAi = true;
    this.engine.multiplayerMode = true;
    this.engine.coreX = data.guestCore[0];
    this.engine.coreY = data.guestCore[1];
    this.engine.enemyCoreX = data.hostCore[0];
    this.engine.enemyCoreY = data.hostCore[1];
    this.revision = data.revision;
    this.send(this.ready, { ready: true }, 'ready');
  }

  private loadResources(role: PlayerRole) {
    if (!this.engine) return;
    const resources = role === 'host' ? this.hostResources : this.guestResources;
    this.engine.repaintCharges = resources.repaintCharges;
    this.engine.duelBombCharges = resources.bombCharges ?? 0;
    if (this.engine.duelBombCharges === 0) this.engine.isDuelBombMode = false;
    this.engine.stats.maxPlayerTerritory = resources.maxTerritory;
    this.engine.stats.enemiesCaptured = resources.enemiesCaptured;
  }

  private storeResources(role: PlayerRole) {
    if (!this.engine) return;
    const resources: PlayerResources = { repaintCharges: this.engine.repaintCharges, maxTerritory: this.engine.stats.maxPlayerTerritory, enemiesCaptured: this.engine.stats.enemiesCaptured, bombCharges: this.engine.duelBombCharges };
    if (role === 'host') this.hostResources = resources; else this.guestResources = resources;
  }

  private duelRandom(channel: number): number {
    if (!this.engine) return 1;
    let value = (this.engine.seed ^ Math.imul(this.round + channel, 0x9e3779b1) ^ Math.imul(this.revision + 1, 0x85ebca6b)) >>> 0;
    value ^= value >>> 16;
    value = Math.imul(value, 0x7feb352d);
    value ^= value >>> 15;
    value = Math.imul(value, 0x846ca68b);
    value ^= value >>> 16;
    return (value >>> 0) / 0x100000000;
  }

  private setDuelResult(title: string, detail: string, tone: ActionResult['tone'] = 'warning') {
    if (!this.engine) return;
    this.engine.lastResult = { id: `duel:${this.round}:${this.revision}:${title}`, title, detail, tone };
  }

  private collectPickup(role: PlayerRole): boolean {
    if (!this.engine?.duelPickup) return false;
    const { x, y } = this.engine.duelPickup;
    const cell = this.engine.world.getExistingCell(x, y);
    const species = role === 'host' ? this.hostSpecies : this.guestSpecies;
    if (!cell?.claimed || cell.currentSpeciesId !== species) return false;
    const resources = role === 'host' ? this.hostResources : this.guestResources;
    resources.bombCharges = 1;
    this.engine.duelPickup = null;
    this.loadResources(this.getRole());
    return true;
  }

  private grantBonusTurn(role: PlayerRole): boolean {
    const consumedBonus = this.bonusTurnFor === role;
    this.bonusTurnFor = undefined;
    if (consumedBonus || this.duelRandom(role === 'host' ? 41 : 43) >= 0.08) return false;
    this.bonusTurnFor = role;
    this.activePlayer = role;
    return true;
  }

  private inheritedTrait(species: SpeciesId): SecondaryTrait {
    if (species === 'cyan' || species === 'violet') return 'armored';
    if (species === 'magenta') return 'parasite';
    return 'swift';
  }

  private maybeCreateHybrid(): boolean {
    if (!this.engine || this.duelRandom(67) >= 0.14) return false;
    const players = [this.hostSpecies, this.guestSpecies];
    const candidates = this.engine.world.getLoadedChunks()
      .flatMap((chunk) => [...chunk.cells.values()])
      .filter((cell) => cell.claimed && cell.revealed && !cell.isCore && !cell.strainId && !players.includes(cell.currentSpeciesId))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    const pairs = candidates.flatMap((cell) => [[1, 0], [0, 1], [1, 1], [1, -1]].map(([dx, dy]) => [cell, this.engine!.world.getExistingCell(cell.x + dx, cell.y + dy)] as const))
      .filter((pair): pair is readonly [typeof candidates[number], NonNullable<typeof pair[1]>] => {
        const neighbor = pair[1];
        return !!neighbor?.claimed && neighbor.revealed && !neighbor.isCore && !neighbor.strainId && !players.includes(neighbor.currentSpeciesId) && neighbor.currentSpeciesId !== pair[0].currentSpeciesId;
      });
    if (!pairs.length) return false;
    const [first, second] = pairs[Math.floor(this.duelRandom(71) * pairs.length)];
    const parents: [SpeciesId, SpeciesId] = [first.currentSpeciesId, second.currentSpeciesId];
    const traits = [...new Set(parents.map((species) => this.inheritedTrait(species)))] as SecondaryTrait[];
    const id = `hybrid:${this.round}:${first.x}:${first.y}:${second.x}:${second.y}`;
    const firstColor = GAME_CONFIG.colors.species[parents[0]].hex;
    const secondColor = GAME_CONFIG.colors.species[parents[1]].hex;
    const mixChannel = (shift: number) => ((((firstColor >> shift) & 0xff) + ((secondColor >> shift) & 0xff)) >> 1) << shift;
    const colorHex = mixChannel(16) | mixChannel(8) | mixChannel(0);
    const cssHex = `#${colorHex.toString(16).padStart(6, '0')}`;
    const strain: Strain = {
      id,
      speciesId: parents[0],
      name: `${GAME_CONFIG.colors.species[parents[0]].shortName} × ${GAME_CONFIG.colors.species[parents[1]].shortName}`,
      trait: traits[0],
      traits,
      parentSpeciesIds: parents,
      colorHex,
      cssHex,
    };
    this.engine.strains.push(strain);
    first.strainId = id;
    second.strainId = id;
    this.setDuelResult('Родился гибридный мох', `${strain.name} наследует поведение обоих родителей: ${traits.join(' + ')}.`, 'warning');
    return true;
  }

  private maybeSpawnPickup(): boolean {
    if (!this.engine || this.engine.duelPickup || this.hostResources.bombCharges > 0 || this.guestResources.bombCharges > 0 || this.duelRandom(83) >= 0.22) return false;
    for (let index = 0; index < 24; index++) {
      const x = 2 + Math.floor(this.duelRandom(89 + index * 2) * 9);
      const y = 2 + Math.floor(this.duelRandom(90 + index * 2) * 9);
      const cell = this.engine.world.getCell(x, y);
      if (cell.isCore || cell.claimed || (cell.blockedUntilTurn && cell.blockedUntilTurn >= this.engine.turn)) continue;
      this.engine.duelPickup = { type: 'sporeBomb', x, y, spawnedRound: this.round };
      this.setDuelResult('На поле упала споровая бомба', `Координаты ${x}:${y}. Первая колония, захватившая клетку, получит одну гарантированную атаку по укреплению квадрата.`, 'warning');
      return true;
    }
    return false;
  }

  private finishAcceptedTurn(role: PlayerRole, message: MpActionMessage) {
    if (!this.engine || this.winner || message.type === 'inspect') return;
    const collectedBomb = this.collectPickup(role);
    if (this.grantBonusTurn(role)) {
      this.setDuelResult('Субстрат вернул ход', `${role === 'host' ? 'Хозяин' : 'Гость'} получает редкий второй ход подряд${collectedBomb ? ' и удерживает споровую бомбу' : ''}.`, 'good');
      return;
    }
    this.activePlayer = role === 'host' ? 'guest' : 'host';
    if (role === 'guest') {
      this.engine.resolveDuelRound(this.round, this.guestSpecies);
      const hostAlive = this.engine.world.getCell(0, 0).currentSpeciesId === this.hostSpecies;
      const guestAlive = this.engine.world.getCell(12, 12).currentSpeciesId === this.guestSpecies;
      if (!hostAlive) this.winner = 'guest';
      else if (!guestAlive) this.winner = 'host';
      this.engine.gameWon = this.winner === 'host';
      this.engine.gameOver = this.winner === 'guest';
      if (!this.winner) {
        const hybridCreated = this.maybeCreateHybrid();
        const pickupSpawned = this.maybeSpawnPickup();
        if (collectedBomb && !hybridCreated && !pickupSpawned) this.setDuelResult('Споровая бомба подобрана', 'Один заряд готов. Он гарантированно разрушит укреплённую клетку квадрата, но не может повредить Ядро.', 'good');
      }
      this.round++;
    } else if (collectedBomb) {
      this.setDuelResult('Споровая бомба подобрана', 'Один заряд готов. Он гарантированно разрушит укреплённую клетку квадрата, но не может повредить Ядро.', 'good');
    }
  }

  private withActingPlayer(role: PlayerRole, action: () => boolean): boolean {
    if (!this.engine) return false;
    const game = this.engine;
    const original = { species: game.playerSpecies, coreX: game.coreX, coreY: game.coreY, enemyX: game.enemyCoreX, enemyY: game.enemyCoreY };
    game.playerSpecies = role === 'host' ? this.hostSpecies : this.guestSpecies;
    game.coreX = role === 'host' ? 0 : 12;
    game.coreY = role === 'host' ? 0 : 12;
    game.enemyCoreX = role === 'host' ? 12 : 0;
    game.enemyCoreY = role === 'host' ? 12 : 0;
    this.loadResources(role);
    const success = action();
    this.storeResources(role);
    game.playerSpecies = original.species;
    game.coreX = original.coreX;
    game.coreY = original.coreY;
    game.enemyCoreX = original.enemyX;
    game.enemyCoreY = original.enemyY;
    this.loadResources(this.getRole());
    game.validateDuelIntents(this.guestSpecies);
    game.updateStats();
    return success;
  }

  private validMessage(message: MpActionMessage): boolean {
    return message.role === 'guest' && message.revision === this.revision && Number.isSafeInteger(message.x) && Number.isSafeInteger(message.y) && Math.abs(message.x) <= 4096 && Math.abs(message.y) <= 4096 && ['reveal', 'attack', 'repaint', 'inspect'].includes(message.type) && (message.useBomb === undefined || typeof message.useBomb === 'boolean') && !this.seenActions.has(message.id);
  }

  private applyAction(message: MpActionMessage): boolean {
    return this.withActingPlayer(message.role, () => {
      if (!this.engine) return false;
      if (message.type === 'reveal') return this.engine.revealCell(message.x, message.y);
      if (message.type === 'attack') return this.engine.attackCell(message.x, message.y, message.useBomb === true);
      if (message.type === 'inspect') return this.engine.inspectObscuredCell(message.x, message.y);
      return this.engine.repaintCell(message.x, message.y);
    });
  }

  private receiveAction(message: MpActionMessage) {
    if (!this.validMessage(message) || this.activePlayer !== 'guest' || !this.engine || this.winner) return;
    this.seenActions.add(message.id);
    const accepted = this.applyAction(message);
    this.lastMove = { id: message.id, role: 'guest', type: message.type, target: `${message.x}:${message.y}`, accepted, title: accepted ? this.engine.lastResult?.title ?? 'Ход разрешён' : 'Ход отклонён', detail: accepted ? this.engine.lastResult?.detail ?? '' : 'Поле изменилось до получения хода. Выберите действие снова.' };
    if (accepted) {
      if (this.engine.gameWon) this.winner = 'guest';
      if (this.engine.gameOver) this.winner = 'host';
      this.engine.gameWon = this.winner === 'host';
      this.engine.gameOver = this.winner === 'guest';
      if (message.type === 'inspect') {
        this.revision++;
        this.broadcastState();
        return;
      }
      this.finishAcceptedTurn('guest', message);
      this.lastMove.title = this.engine.lastResult?.title ?? this.lastMove.title;
      this.lastMove.detail = this.engine.lastResult?.detail ?? this.lastMove.detail;
    }
    this.revision++;
    this.broadcastState();
  }

  public performAction(x: number, y: number, type: MpActionType): boolean {
    if (!this.engine || !this.isMyTurn()) return false;
    const role = this.getRole();
    const useBomb = type === 'attack' && this.engine.isDuelBombMode && this.engine.duelBombCharges > 0;
    const message: MpActionMessage = { id: `${role}:${this.revision}:${x}:${y}:${type}${useBomb ? ':bomb' : ''}`, type, x, y, role, revision: this.revision, useBomb };
    if (this.isHost) {
      const accepted = this.applyAction(message);
      this.lastMove = { id: message.id, role, type, target: `${x}:${y}`, accepted, title: accepted ? this.engine.lastResult?.title ?? 'Ход разрешён' : 'Ход отклонён', detail: accepted ? this.engine.lastResult?.detail ?? '' : 'Сейчас это действие недоступно.' };
      if (!accepted) { this.notify('rejected', this.lastMove); return false; }
      if (type === 'inspect') {
        this.revision++;
        this.broadcastState();
        return true;
      }
      if (this.engine.gameWon) this.winner = 'host';
      if (this.engine.gameOver) this.winner = 'guest';
      this.finishAcceptedTurn('host', message);
      this.lastMove.title = this.engine.lastResult?.title ?? this.lastMove.title;
      this.lastMove.detail = this.engine.lastResult?.detail ?? this.lastMove.detail;
      this.revision++;
      this.broadcastState();
      return true;
    }
    this.pendingAction = true;
    this.send(this.action, message, 'action');
    this.notify('sync');
    return true;
  }

  private buildCells(): SyncedCell[] {
    if (!this.engine) return [];
    return this.engine.world.getLoadedChunks().flatMap((chunk) => [...chunk.cells.values()]).filter((cell) => cell.claimed || cell.revealed || cell.blockedUntilTurn).map((cell) => ({ x: cell.x, y: cell.y, naturalSpecies: cell.naturalSpeciesId, species: cell.currentSpeciesId, claimed: cell.claimed, revealed: cell.revealed, reinforcement: cell.reinforcement, isCore: cell.isCore, strainId: cell.strainId, isSnapHidden: cell.isSnapHidden, obscuredUntilTurn: cell.obscuredUntilTurn, blockedUntilTurn: cell.blockedUntilTurn, dormantUntilTurn: cell.dormantUntilTurn }));
  }

  private broadcastState() {
    if (!this.isHost || !this.engine) return;
    const state: MpStateSyncMessage = { revision: this.revision, round: this.round, turn: this.engine.turn, activePlayer: this.activePlayer, cells: this.buildCells(), hostResources: this.hostResources, guestResources: this.guestResources, strains: this.engine.strains, lastEvent: this.engine.lastEvent, lastSquares: this.engine.lastSquaresMatched, animEvents: this.engine.animEvents, activeIntents: this.engine.activeIntents, roundResult: this.engine.lastResult, lastMove: this.lastMove, winner: this.winner, pickup: this.engine.duelPickup, bonusTurnFor: this.bonusTurnFor };
    this.send(this.sync, state, 'sync');
    this.notify('sync', state);
  }

  private receiveSync(state: MpStateSyncMessage) {
    if (this.isHost || !this.engine || state.revision <= this.lastAppliedRevision) return;
    this.lastAppliedRevision = state.revision;
    this.revision = state.revision;
    this.round = state.round;
    this.activePlayer = state.activePlayer;
    this.pendingAction = false;
    this.hostResources = state.hostResources;
    this.guestResources = state.guestResources;
    this.lastMove = state.lastMove;
    this.winner = state.winner;
    this.bonusTurnFor = state.bonusTurnFor;
    this.engine.turn = state.turn;
    this.engine.duelPickup = state.pickup ?? null;
    const nextKeys = new Set(state.cells.map((item) => `${item.x}:${item.y}`));
    for (const key of this.syncedKeys) {
      if (nextKeys.has(key)) continue;
      const [x, y] = key.split(':').map(Number);
      const cell = this.engine.world.getExistingCell(x, y);
      if (!cell) continue;
      cell.currentSpeciesId = cell.naturalSpeciesId;
      cell.claimed = false;
      cell.revealed = false;
      cell.reinforcement = 1;
      cell.isCore = false;
      cell.strainId = undefined;
      cell.isSnapHidden = false;
      cell.obscuredUntilTurn = undefined;
      cell.blockedUntilTurn = undefined;
      cell.dormantUntilTurn = undefined;
    }
    this.syncedKeys = nextKeys;
    for (const item of state.cells) {
      const cell = this.engine.world.getCell(item.x, item.y);
      cell.naturalSpeciesId = item.naturalSpecies;
      cell.currentSpeciesId = item.species;
      cell.claimed = item.claimed;
      cell.revealed = item.revealed;
      cell.reinforcement = item.reinforcement;
      cell.isCore = item.isCore;
      cell.strainId = item.strainId;
      cell.isSnapHidden = item.isSnapHidden;
      cell.obscuredUntilTurn = item.obscuredUntilTurn;
      cell.blockedUntilTurn = item.blockedUntilTurn;
      cell.dormantUntilTurn = item.dormantUntilTurn;
    }
    this.engine.strains = state.strains;
    this.engine.lastEvent = state.lastEvent;
    this.engine.lastSquaresMatched = state.lastSquares;
    this.engine.animEvents = state.animEvents;
    this.engine.activeIntents = state.activeIntents ?? [];
    this.engine.lastResult = state.roundResult ?? null;
    this.engine.gameOver = state.winner === 'host';
    this.engine.gameWon = state.winner === 'guest';
    this.loadResources('guest');
    this.engine.isCoreInDanger = this.engine.activeIntents.some((intent) => intent.targetCell === `${this.engine!.coreX}:${this.engine!.coreY}`);
    this.engine.refresh(false);
    if (!this.isConnected) { this.isConnected = true; this.notify('connected'); }
    this.notify(state.lastMove?.accepted === false ? 'rejected' : 'sync', state.lastMove);
  }

  private handleLocal(message: { kind: string; data?: WireMessage }) {
    if (message.kind === 'hello' && this.isHost && message.data) {
      const requested = (message.data as GuestHello).species;
      this.guestSpecies = requested === this.hostSpecies ? this.fallbackGuestSpecies() : requested;
      if (requested === this.hostSpecies) this.connectionNote = `Выбранное семейство занято · гость адаптирован к «${GAME_CONFIG.colors.species[this.guestSpecies].name}»`;
      this.createHostMatch();
    }
    if (message.kind === 'init' && !this.isHost && message.data) this.receiveInit(message.data as MpInitMessage);
    if (message.kind === 'ready' && this.isHost) { this.isConnected = true; this.notify('connected'); this.broadcastState(); }
    if (message.kind === 'action' && this.isHost && message.data) this.receiveAction(message.data as MpActionMessage);
    if (message.kind === 'sync' && !this.isHost && message.data) this.receiveSync(message.data as MpStateSyncMessage);
  }

  public leave() {
    this.transportAttempt++;
    this.closeTransport();
    this.engine = null;
    this.isConnected = false;
    this.pendingAction = false;
  }
}
