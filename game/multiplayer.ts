import { joinRoom } from 'trystero/nostr';
import { SpeciesId } from './config';
import { GameEngine } from './engine';
import { SquareMatch, WorldEvent } from './types';

export interface MpActionMessage {
  [key: string]: any;
  type: 'reveal' | 'repaint';
  x: number;
  y: number;
  playerId: string;
}

export interface MpStateSyncMessage {
  [key: string]: any;
  turn: number;
  activePlayerId: string;
  revealedCells: Array<{ x: number; y: number; species: SpeciesId }>;
  modifiedCells: Array<{ x: number; y: number; species: SpeciesId; reinforcement: number }>;
  lastEvent: WorldEvent | null;
  lastSquares: SquareMatch[];
  hostShields: number;
  guestShields: number;
  winnerId?: string;
}

export interface MpInitMessage {
  [key: string]: any;
  seed: number;
  hostSpecies: SpeciesId;
  guestSpecies: SpeciesId;
  hostCore: [number, number];
  guestCore: [number, number];
  hostPeerId: string;
}

export type MpCallback = (event: string, data?: any) => void;

function getActionPair(actionRes: any): [any, any] {
  if (Array.isArray(actionRes)) {
    return [actionRes[0], actionRes[1]];
  }
  if (actionRes && typeof actionRes === 'object') {
    const keys = Object.keys(actionRes);
    return [actionRes[keys[0]] || actionRes.send || actionRes[0], actionRes[keys[1]] || actionRes.get || actionRes[1]];
  }
  return [actionRes, actionRes];
}

export class MultiplayerManager {
  public isHost: boolean = false;
  public roomCode: string = '';
  public peerId: string = '';
  public opponentPeerId: string | null = null;
  public isConnected: boolean = false;

  private room: any = null;
  private bcChannel: BroadcastChannel | null = null;
  private sendAction: any;
  private sendStateSync: any;
  private sendInit: any;

  public hostSpecies: SpeciesId = 'cyan';
  public guestSpecies: SpeciesId = 'coral';

  public engine: GameEngine | null = null;
  public activePlayerId: string = '';

  private listeners: Set<MpCallback> = new Set();

  constructor() {
    this.peerId = Math.random().toString(36).substring(2, 9);
  }

  public subscribe(cb: MpCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify(event: string, data?: any) {
    this.listeners.forEach((cb) => cb(event, data));
  }

  public hostRoom(roomCode: string, hostSpecies: SpeciesId) {
    this.isHost = true;
    this.roomCode = roomCode.toUpperCase();
    this.hostSpecies = hostSpecies;
    this.guestSpecies = hostSpecies === 'cyan' ? 'coral' : 'cyan';

    this.initRoom();
  }

  public joinRoom(roomCode: string, guestSpecies: SpeciesId) {
    this.isHost = false;
    this.roomCode = roomCode.toUpperCase();
    this.guestSpecies = guestSpecies;

    this.initRoom();
  }

  private initRoom() {
    // Enable BroadcastChannel fallback for instant localhost tab-to-tab connections
    if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
      this.bcChannel = new BroadcastChannel(`fungal_mp_${this.roomCode}`);
      this.bcChannel.onmessage = (e) => this.handleBcMessage(e.data);

      if (!this.isHost) {
        // Guest sends ping to host on localhost BroadcastChannel
        setTimeout(() => {
          this.bcChannel?.postMessage({ type: 'guest_hello', peerId: this.peerId });
        }, 200);
      }
    }

    try {
      const config = { appId: 'fungal_conquest_v1' };
      this.room = joinRoom(config, this.roomCode);

      if (this.room && typeof this.room.makeAction === 'function') {
        const [sendAction, getAction] = getActionPair(this.room.makeAction('action'));
        const [sendStateSync, getStateSync] = getActionPair(this.room.makeAction('sync'));
        const [sendInit, getInit] = getActionPair(this.room.makeAction('init'));

        this.sendAction = sendAction;
        this.sendStateSync = sendStateSync;
        this.sendInit = sendInit;

        if (typeof this.room.onPeerJoin === 'function') {
          this.room.onPeerJoin((peerId: string) => {
            this.handlePeerConnect(peerId);
          });
        }

        if (typeof this.room.onPeerLeave === 'function') {
          this.room.onPeerLeave(() => {
            this.handlePeerDisconnect();
          });
        }

        if (getInit) {
          getInit((data: MpInitMessage, peerId: string) => {
            this.handleInitData(data, peerId);
          });
        }

        if (getAction) {
          getAction((msg: MpActionMessage) => {
            this.handleActionMsg(msg);
          });
        }

        if (getStateSync) {
          getStateSync((data: MpStateSyncMessage) => {
            this.handleSyncData(data);
          });
        }
      }
    } catch (e) {
      console.warn('Trystero WebRTC initialization warning:', e);
    }
  }

  private handlePeerConnect(peerId: string) {
    this.opponentPeerId = peerId;
    this.isConnected = true;

    if (this.isHost) {
      const seed = Math.floor(Math.random() * 1000000);
      const hostCore: [number, number] = [0, 0];
      const guestCore: [number, number] = [10, 10];

      this.engine = new GameEngine(this.hostSpecies, seed);
      this.engine.coreX = 0;
      this.engine.coreY = 0;
      this.engine.enemyCoreX = guestCore[0];
      this.engine.enemyCoreY = guestCore[1];

      const guestCoreCell = this.engine.world.getCell(guestCore[0], guestCore[1]);
      guestCoreCell.currentSpeciesId = this.guestSpecies;
      guestCoreCell.revealed = true;
      guestCoreCell.isCore = true;
      guestCoreCell.reinforcement = 3;

      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const c = this.engine.world.getCell(guestCore[0] + dx, guestCore[1] + dy);
          c.currentSpeciesId = this.guestSpecies;
          c.revealed = true;
          c.reinforcement = 2;
        }
      }

      this.activePlayerId = this.peerId;

      const initPayload: MpInitMessage = {
        seed,
        hostSpecies: this.hostSpecies,
        guestSpecies: this.guestSpecies,
        hostCore,
        guestCore,
        hostPeerId: this.peerId,
      };

      if (this.sendInit) this.sendInit(initPayload);
      if (this.bcChannel) this.bcChannel.postMessage({ type: 'init', payload: initPayload, peerId: this.peerId });

      this.notify('connected');
      this.broadcastState();
    }
  }

  private handlePeerDisconnect() {
    this.isConnected = false;
    this.opponentPeerId = null;
    this.notify('disconnected');
  }

  private handleInitData(data: MpInitMessage, peerId: string) {
    if (!this.isHost) {
      this.opponentPeerId = peerId;
      this.isConnected = true;
      this.hostSpecies = data.hostSpecies;
      this.guestSpecies = data.guestSpecies;

      this.engine = new GameEngine(data.guestSpecies, data.seed);
      this.engine.coreX = data.guestCore[0];
      this.engine.coreY = data.guestCore[1];
      this.engine.enemyCoreX = data.hostCore[0];
      this.engine.enemyCoreY = data.hostCore[1];

      this.notify('connected');
    }
  }

  private handleActionMsg(msg: MpActionMessage) {
    if (this.isHost && this.engine) {
      if (this.activePlayerId !== msg.playerId) return;

      let success = false;
      if (msg.type === 'reveal') {
        success = this.engine.revealCell(msg.x, msg.y);
      } else if (msg.type === 'repaint') {
        success = this.engine.repaintCell(msg.x, msg.y);
      }

      if (success) {
        this.activePlayerId = this.opponentPeerId || msg.playerId;
        this.broadcastState();
      }
    }
  }

  private handleSyncData(data: MpStateSyncMessage) {
    if (!this.isHost && this.engine) {
      this.engine.turn = data.turn;
      this.activePlayerId = data.activePlayerId;

      for (const item of data.revealedCells) {
        const c = this.engine.world.getCell(item.x, item.y);
        c.revealed = true;
        c.currentSpeciesId = item.species;
      }

      for (const mod of data.modifiedCells) {
        const c = this.engine.world.getCell(mod.x, mod.y);
        c.currentSpeciesId = mod.species;
        c.reinforcement = mod.reinforcement;
      }

      this.engine.lastEvent = data.lastEvent;
      this.engine.lastSquaresMatched = data.lastSquares;
      this.engine.updateStats();

      this.notify('sync');
    }
  }

  private handleBcMessage(msg: any) {
    if (!msg || typeof msg !== 'object') return;

    if (msg.type === 'guest_hello' && this.isHost) {
      this.handlePeerConnect(msg.peerId);
    } else if (msg.type === 'init' && !this.isHost) {
      this.handleInitData(msg.payload, msg.peerId);
    } else if (msg.type === 'action' && this.isHost) {
      this.handleActionMsg(msg.payload);
    } else if (msg.type === 'sync' && !this.isHost) {
      this.handleSyncData(msg.payload);
    }
  }

  public performAction(x: number, y: number, type: 'reveal' | 'repaint'): boolean {
    if (!this.engine || !this.isConnected) return false;
    if (this.activePlayerId !== this.peerId) return false;

    if (this.isHost) {
      let success = false;
      if (type === 'reveal') {
        success = this.engine.revealCell(x, y);
      } else {
        success = this.engine.repaintCell(x, y);
      }

      if (success) {
        this.activePlayerId = this.opponentPeerId!;
        this.broadcastState();
      }
      return success;
    } else {
      const payload: MpActionMessage = { type, x, y, playerId: this.peerId };
      if (this.sendAction) this.sendAction(payload);
      if (this.bcChannel) this.bcChannel.postMessage({ type: 'action', payload });
      return true;
    }
  }

  public broadcastState() {
    if (!this.isHost || !this.engine) return;

    const revealedCells: Array<{ x: number; y: number; species: SpeciesId }> = [];
    const modifiedCells: Array<{ x: number; y: number; species: SpeciesId; reinforcement: number }> = [];

    for (const chunk of this.engine.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        if (cell.revealed) {
          revealedCells.push({ x: cell.x, y: cell.y, species: cell.currentSpeciesId });
        }
        if (cell.reinforcement > 1) {
          modifiedCells.push({ x: cell.x, y: cell.y, species: cell.currentSpeciesId, reinforcement: cell.reinforcement });
        }
      }
    }

    const payload: MpStateSyncMessage = {
      turn: this.engine.turn,
      activePlayerId: this.activePlayerId,
      revealedCells,
      modifiedCells,
      lastEvent: this.engine.lastEvent,
      lastSquares: this.engine.lastSquaresMatched,
      hostShields: 1,
      guestShields: 1,
    };

    if (this.sendStateSync) this.sendStateSync(payload);
    if (this.bcChannel) this.bcChannel.postMessage({ type: 'sync', payload });
  }

  public leave() {
    if (this.bcChannel) {
      try { this.bcChannel.close(); } catch (_) {}
      this.bcChannel = null;
    }
    if (this.room) {
      try {
        if (typeof this.room.leave === 'function') this.room.leave();
      } catch (_) {}
      this.room = null;
    }
    this.isConnected = false;
  }
}
