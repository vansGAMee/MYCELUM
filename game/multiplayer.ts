import { joinRoom } from 'trystero/nostr';
import type { DataPayload, MessageAction, Room } from '@trystero-p2p/core';
import { GAME_CONFIG, type SpeciesId } from './config';
import { GameEngine } from './engine';
import type { ActionResult, CellKey, EnemyIntent, GameAnimEvent, SquareMatch, Strain, WorldEvent } from './types';

export type MpActionType = 'reveal' | 'attack' | 'repaint' | 'inspect';
export type PlayerRole = 'host' | 'guest';
export type MultiplayerStatus = 'idle' | 'waiting' | 'connecting' | 'connected' | 'your_turn' | 'opponent_turn' | 'disconnected' | 'error';

interface WireMessage { [key: string]: unknown }

export interface MpActionMessage extends WireMessage {
  id: string;
  type: MpActionType;
  x: number;
  y: number;
  role: PlayerRole;
  revision: number;
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
  private hostResources: PlayerResources = { repaintCharges: 2, maxTerritory: 9, enemiesCaptured: 0 };
  private guestResources: PlayerResources = { repaintCharges: 2, maxTerritory: 9, enemiesCaptured: 0 };

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
    this.resetSession();
    this.isHost = true;
    this.roomCode = code.trim().toUpperCase();
    this.hostSpecies = species;
    this.initializeTransport();
    this.notify('waiting', { roomCode: this.roomCode });
  }

  public joinRoom(code: string, species: SpeciesId) {
    this.resetSession();
    this.isHost = false;
    this.roomCode = code.trim().toUpperCase();
    this.guestSpecies = species;
    this.initializeTransport();
    this.notify('waiting', { roomCode: this.roomCode });
    this.sendHello();
  }

  private resetSession() {
    this.winner = undefined;
    this.round = 1;
    this.revision = 0;
    this.pendingAction = false;
    this.lastMove = undefined;
    this.connectionNote = undefined;
    this.seenActions.clear();
    this.lastAppliedRevision = -1;
    this.syncedKeys.clear();
    this.isConnected = false;
    this.opponentPeerId = null;
    this.hostResources = { repaintCharges: 2, maxTerritory: 9, enemiesCaptured: 0 };
    this.guestResources = { repaintCharges: 2, maxTerritory: 9, enemiesCaptured: 0 };
  }

  private initializeTransport() {
    if (!this.roomCode) { this.notify('error', 'Room code is required.'); return; }
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`mycelium:${this.roomCode}`);
      this.channel.onmessage = ({ data }) => this.handleLocal(data as { kind: string; data?: WireMessage });
    }
    try {
      this.room = joinRoom({ appId: 'mycelium-v3' }, this.roomCode, { onJoinError: ({ error }) => this.notify('error', error) });
      this.action = this.room.makeAction('action');
      this.sync = this.room.makeAction('sync');
      this.init = this.room.makeAction('init');
      this.hello = this.room.makeAction('hello');
      this.ready = this.room.makeAction('ready');
      this.room.onPeerJoin = (peerId) => {
        if (this.opponentPeerId && this.opponentPeerId !== peerId) return;
        this.opponentPeerId = peerId;
        if (!this.isHost) this.sendHello();
      };
      this.room.onPeerLeave = (peerId) => {
        if (peerId !== this.opponentPeerId) return;
        this.isConnected = false;
        this.pendingAction = false;
        this.notify('disconnected');
      };
      this.hello.onMessage = (payload, { peerId }) => {
        const data = payload as GuestHello;
        if (!this.isHost || (this.opponentPeerId && peerId !== this.opponentPeerId)) return;
        this.opponentPeerId = peerId;
        this.guestSpecies = data.species === this.hostSpecies ? this.fallbackGuestSpecies() : data.species;
        if (data.species === this.hostSpecies) this.connectionNote = `Выбранное семейство занято · гость адаптирован к «${GAME_CONFIG.colors.species[this.guestSpecies].name}»`;
        this.createHostMatch();
      };
      this.init.onMessage = (payload, { peerId }) => {
        const data = payload as MpInitMessage;
        if (this.isHost || (this.opponentPeerId && peerId !== this.opponentPeerId)) return;
        this.opponentPeerId = peerId;
        this.receiveInit(data);
      };
      this.ready.onMessage = (_data, { peerId }) => {
        if (!this.isHost || peerId !== this.opponentPeerId) return;
        this.isConnected = true;
        this.notify('connected');
        this.broadcastState();
      };
      this.action.onMessage = (payload, { peerId }) => {
        const message = payload as MpActionMessage;
        if (!this.isHost || peerId !== this.opponentPeerId) return;
        this.receiveAction(message);
      };
      this.sync.onMessage = (payload, { peerId }) => {
        const state = payload as MpStateSyncMessage;
        if (this.isHost || peerId !== this.opponentPeerId) return;
        this.receiveSync(state);
      };
    } catch (error) {
      this.notify('error', error instanceof Error ? error.message : 'Не удалось создать прямое соединение.');
    }
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
    this.engine.stats.maxPlayerTerritory = resources.maxTerritory;
    this.engine.stats.enemiesCaptured = resources.enemiesCaptured;
  }

  private storeResources(role: PlayerRole) {
    if (!this.engine) return;
    const resources: PlayerResources = { repaintCharges: this.engine.repaintCharges, maxTerritory: this.engine.stats.maxPlayerTerritory, enemiesCaptured: this.engine.stats.enemiesCaptured };
    if (role === 'host') this.hostResources = resources; else this.guestResources = resources;
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
    return message.role === 'guest' && message.revision === this.revision && Number.isSafeInteger(message.x) && Number.isSafeInteger(message.y) && Math.abs(message.x) <= 4096 && Math.abs(message.y) <= 4096 && ['reveal', 'attack', 'repaint', 'inspect'].includes(message.type) && !this.seenActions.has(message.id);
  }

  private applyAction(message: MpActionMessage): boolean {
    return this.withActingPlayer(message.role, () => {
      if (!this.engine) return false;
      if (message.type === 'reveal') return this.engine.revealCell(message.x, message.y);
      if (message.type === 'attack') return this.engine.attackCell(message.x, message.y);
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
      this.activePlayer = 'host';
      this.engine.resolveDuelRound(this.round, this.guestSpecies);
      const hostAlive = this.engine.world.getCell(0, 0).currentSpeciesId === this.hostSpecies;
      const guestAlive = this.engine.world.getCell(12, 12).currentSpeciesId === this.guestSpecies;
      if (!hostAlive) this.winner = 'guest';
      else if (!guestAlive) this.winner = 'host';
      this.engine.gameWon = this.winner === 'host';
      this.engine.gameOver = this.winner === 'guest';
      this.round++;
    }
    this.revision++;
    this.broadcastState();
  }

  public performAction(x: number, y: number, type: MpActionType): boolean {
    if (!this.engine || !this.isMyTurn()) return false;
    const role = this.getRole();
    const message: MpActionMessage = { id: `${role}:${this.revision}:${x}:${y}:${type}`, type, x, y, role, revision: this.revision };
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
      this.activePlayer = 'guest';
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
    const state: MpStateSyncMessage = { revision: this.revision, round: this.round, turn: this.engine.turn, activePlayer: this.activePlayer, cells: this.buildCells(), hostResources: this.hostResources, guestResources: this.guestResources, strains: this.engine.strains, lastEvent: this.engine.lastEvent, lastSquares: this.engine.lastSquaresMatched, animEvents: this.engine.animEvents, activeIntents: this.engine.activeIntents, roundResult: this.engine.lastResult, lastMove: this.lastMove, winner: this.winner };
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
    this.engine.turn = state.turn;
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
    this.channel?.close();
    this.channel = null;
    if (this.room) void this.room.leave();
    this.room = null;
    this.engine = null;
    this.isConnected = false;
    this.pendingAction = false;
  }
}
