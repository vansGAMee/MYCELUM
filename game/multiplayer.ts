import { joinRoom } from 'trystero/nostr';
import type { SpeciesId } from './config';
import { GameEngine } from './engine';
import type { SquareMatch, WorldEvent } from './types';

export type MpActionType = 'reveal' | 'attack' | 'repaint';
type PlayerRole = 'host' | 'guest';

export interface MpActionMessage {
  [key: string]: unknown;
  type: MpActionType;
  x: number;
  y: number;
  role: PlayerRole;
}

interface SyncedCell {
  x: number;
  y: number;
  species: SpeciesId;
  claimed: boolean;
  revealed: boolean;
  reinforcement: number;
  isCore?: boolean;
}

export interface MpStateSyncMessage {
  [key: string]: unknown;
  turn: number;
  activePlayer: PlayerRole;
  cells: SyncedCell[];
  lastEvent: WorldEvent | null;
  lastSquares: SquareMatch[];
  gameOver: boolean;
  gameWon: boolean;
  winner?: PlayerRole;
}

export interface MpInitMessage {
  [key: string]: unknown;
  seed: number;
  hostSpecies: SpeciesId;
  guestSpecies: SpeciesId;
  hostCore: [number, number];
  guestCore: [number, number];
}

export type MpCallback = (event: 'connected' | 'sync' | 'disconnected' | 'error', data?: unknown) => void;

function actionPair(result: unknown): [(data: unknown) => void, (callback: (data: never, peerId: string) => void) => void] {
  if (Array.isArray(result)) return [result[0], result[1]];
  const value = result as Record<string, unknown>;
  const keys = Object.keys(value ?? {});
  return [(value?.send ?? value?.[keys[0]]) as (data: unknown) => void, (value?.get ?? value?.[keys[1]]) as (callback: (data: never, peerId: string) => void) => void];
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

  private room: ReturnType<typeof joinRoom> | null = null;
  private channel: BroadcastChannel | null = null;
  private sendAction?: (data: unknown) => void;
  private sendSync?: (data: unknown) => void;
  private sendInit?: (data: unknown) => void;
  private listeners = new Set<MpCallback>();

  public subscribe(callback: MpCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify(event: Parameters<MpCallback>[0], data?: unknown) {
    for (const listener of this.listeners) listener(event, data);
  }

  public hostRoom(code: string, species: SpeciesId) {
    this.isHost = true;
    this.roomCode = code.trim().toUpperCase();
    this.hostSpecies = species;
    this.guestSpecies = species === 'coral' ? 'cyan' : 'coral';
    this.initializeTransport();
  }

  public joinRoom(code: string, species: SpeciesId) {
    this.isHost = false;
    this.roomCode = code.trim().toUpperCase();
    this.guestSpecies = species;
    this.initializeTransport();
  }

  private initializeTransport() {
    if (!this.roomCode) {
      this.notify('error');
      return;
    }
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.channel = new BroadcastChannel(`mycelium:${this.roomCode}`);
      this.channel.onmessage = ({ data }) => this.handleLocal(data);
      if (!this.isHost) window.setTimeout(() => this.channel?.postMessage({ kind: 'hello' }), 120);
    }
    try {
      this.room = joinRoom({ appId: 'mycelium-v2' }, this.roomCode);
      const [sendAction, getAction] = actionPair(this.room.makeAction('action'));
      const [sendSync, getSync] = actionPair(this.room.makeAction('sync'));
      const [sendInit, getInit] = actionPair(this.room.makeAction('init'));
      this.sendAction = sendAction;
      this.sendSync = sendSync;
      this.sendInit = sendInit;
      this.room.onPeerJoin = () => { if (this.isHost) this.connectHost(); };
      this.room.onPeerLeave = () => { this.isConnected = false; this.notify('disconnected'); };
      getAction((message: MpActionMessage) => this.receiveAction(message));
      getSync((state: MpStateSyncMessage) => this.receiveSync(state));
      getInit((data: MpInitMessage) => this.receiveInit(data));
    } catch {
      if (!this.channel) this.notify('error');
    }
  }

  private connectHost() {
    if (!this.isHost || this.isConnected) return;
    const seed = crypto.getRandomValues(new Uint32Array(1))[0];
    this.engine = new GameEngine(this.hostSpecies, seed);
    this.engine.suppressAi = true;
    this.engine.enemyCoreX = 12;
    this.engine.enemyCoreY = 12;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.engine.world.getCell(12 + dx, 12 + dy);
        cell.currentSpeciesId = this.guestSpecies;
        cell.naturalSpeciesId = this.guestSpecies;
        cell.claimed = true;
        cell.revealed = true;
        cell.reinforcement = dx === 0 && dy === 0 ? 3 : 1;
        cell.isCore = dx === 0 && dy === 0;
      }
    }
    this.activePlayer = 'host';
    this.isConnected = true;
    const init: MpInitMessage = { seed, hostSpecies: this.hostSpecies, guestSpecies: this.guestSpecies, hostCore: [0, 0], guestCore: [12, 12] };
    this.sendInit?.(init);
    this.channel?.postMessage({ kind: 'init', data: init });
    this.notify('connected');
    this.broadcastState();
  }

  private receiveInit(data: MpInitMessage) {
    if (this.isHost) return;
    this.hostSpecies = data.hostSpecies;
    this.guestSpecies = data.guestSpecies;
    this.engine = new GameEngine(this.guestSpecies, data.seed);
    this.engine.suppressAi = true;
    this.engine.coreX = data.guestCore[0];
    this.engine.coreY = data.guestCore[1];
    this.engine.enemyCoreX = data.hostCore[0];
    this.engine.enemyCoreY = data.hostCore[1];
    this.isConnected = true;
    this.notify('connected');
  }

  private withActingPlayer(role: PlayerRole, action: () => boolean): boolean {
    if (!this.engine) return false;
    const game = this.engine;
    const original = { species: game.playerSpecies, coreX: game.coreX, coreY: game.coreY, enemyX: game.enemyCoreX, enemyY: game.enemyCoreY };
    if (role === 'guest') {
      game.playerSpecies = this.guestSpecies;
      game.coreX = 12;
      game.coreY = 12;
      game.enemyCoreX = 0;
      game.enemyCoreY = 0;
    } else {
      game.playerSpecies = this.hostSpecies;
      game.coreX = 0;
      game.coreY = 0;
      game.enemyCoreX = 12;
      game.enemyCoreY = 12;
    }
    const success = action();
    game.playerSpecies = original.species;
    game.coreX = original.coreX;
    game.coreY = original.coreY;
    game.enemyCoreX = original.enemyX;
    game.enemyCoreY = original.enemyY;
    game.updateStats();
    return success;
  }

  private applyAction(message: MpActionMessage): boolean {
    return this.withActingPlayer(message.role, () => {
      if (!this.engine) return false;
      if (message.type === 'reveal') return this.engine.revealCell(message.x, message.y);
      if (message.type === 'attack') return this.engine.attackCell(message.x, message.y);
      return this.engine.repaintCell(message.x, message.y);
    });
  }

  private receiveAction(message: MpActionMessage) {
    if (!this.isHost || message.role !== this.activePlayer) return;
    if (this.applyAction(message)) {
      if (this.engine?.gameWon) this.winner = message.role;
      this.activePlayer = message.role === 'host' ? 'guest' : 'host';
      this.broadcastState();
      if (this.winner === 'guest' && this.engine) { this.engine.gameWon = false; this.engine.gameOver = true; this.engine.refresh(); }
    }
  }

  public performAction(x: number, y: number, type: MpActionType): boolean {
    if (!this.engine || !this.isConnected) return false;
    const role: PlayerRole = this.isHost ? 'host' : 'guest';
    if (this.activePlayer !== role) return false;
    const message: MpActionMessage = { type, x, y, role };
    if (this.isHost) {
      const success = this.applyAction(message);
      if (success) {
        if (this.engine?.gameWon) this.winner = 'host';
        this.activePlayer = 'guest';
        this.broadcastState();
      }
      return success;
    }
    this.sendAction?.(message);
    this.channel?.postMessage({ kind: 'action', data: message });
    return true;
  }

  private broadcastState() {
    if (!this.isHost || !this.engine) return;
    const cells: SyncedCell[] = [];
    for (const chunk of this.engine.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        if (!cell.claimed && !cell.revealed) continue;
        cells.push({ x: cell.x, y: cell.y, species: cell.currentSpeciesId, claimed: cell.claimed, revealed: cell.revealed, reinforcement: cell.reinforcement, isCore: cell.isCore });
      }
    }
    const state: MpStateSyncMessage = { turn: this.engine.turn, activePlayer: this.activePlayer, cells, lastEvent: this.engine.lastEvent, lastSquares: this.engine.lastSquaresMatched, gameOver: this.engine.gameOver, gameWon: this.engine.gameWon, winner: this.winner };
    this.sendSync?.(state);
    this.channel?.postMessage({ kind: 'sync', data: state });
  }

  private receiveSync(state: MpStateSyncMessage) {
    if (this.isHost || !this.engine) return;
    this.activePlayer = state.activePlayer;
    this.engine.turn = state.turn;
    for (const item of state.cells) {
      const cell = this.engine.world.getCell(item.x, item.y);
      cell.currentSpeciesId = item.species;
      cell.claimed = item.claimed;
      cell.revealed = item.revealed;
      cell.reinforcement = item.reinforcement;
      cell.isCore = item.isCore;
    }
    this.engine.lastEvent = state.lastEvent;
    this.engine.lastSquaresMatched = state.lastSquares;
    this.winner = state.winner;
    this.engine.gameOver = state.winner ? state.winner !== 'guest' : state.gameOver;
    this.engine.gameWon = state.winner === 'guest' || (!state.winner && state.gameWon);
    this.engine.refresh();
    this.notify('sync');
  }

  private handleLocal(message: { kind: string; data?: never }) {
    if (message.kind === 'hello' && this.isHost) this.connectHost();
    if (message.kind === 'init' && !this.isHost && message.data) this.receiveInit(message.data as MpInitMessage);
    if (message.kind === 'action' && this.isHost && message.data) this.receiveAction(message.data as MpActionMessage);
    if (message.kind === 'sync' && !this.isHost && message.data) this.receiveSync(message.data as MpStateSyncMessage);
  }

  public leave() {
    this.channel?.close();
    this.channel = null;
    this.room?.leave();
    this.room = null;
    this.isConnected = false;
  }
}
