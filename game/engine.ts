import { GAME_CONFIG, SpeciesId } from './config';
import { WorldEventManager } from './events';
import { PRNG } from './rng';
import { SaveManager } from './save';
import { SpreadSimulator } from './spread';
import { SquareDetector } from './squares';
import {
  CellKey,
  EnemyIntent,
  EventLogEntry,
  GameAnimEvent,
  GameStats,
  SaveData,
  SpeciesPrediction,
  SquareMatch,
  Strain,
  WorldEvent,
} from './types';
import { getCellKey, WorldManager } from './world';

export type EngineCallback = () => void;

const DIRS8 = [
  [-1,-1],[-1,0],[-1,1],[0,-1],[0,1],[1,-1],[1,0],[1,1]
];

const DIRS4 = [
  [-1,0],[1,0],[0,-1],[0,1]
];

export class GameEngine {
  public seed: number;
  public prng: PRNG;
  public world: WorldManager;
  public playerSpecies: SpeciesId;

  public turn: number = 1;
  public repaintCharges: number = GAME_CONFIG.startingRepaints; // 2
  public isRepaintMode: boolean = false;
  public coreX: number = 0;
  public coreY: number = 0;

  // Enemy Core tracking for 1v1 multiplayer
  public enemyCoreX: number | null = null;
  public enemyCoreY: number | null = null;

  public gameOver: boolean = false;
  public gameWon: boolean = false;

  public strains: Strain[] = [];
  public currentCombo: number = 0;
  public activeIntents: EnemyIntent[] = [];
  public isCoreInDanger: boolean = false;

  public lastEvent: WorldEvent | null = null;
  public lastSquaresMatched: SquareMatch[] = [];
  public eventLogs: EventLogEntry[] = [];
  public animEvents: GameAnimEvent[] = [];

  public stats: GameStats = {
    turnCount: 1,
    playerTerritory: 9,
    maxPlayerTerritory: 9,
    totalSquaresCaptured: 0,
    largestSquareSize: 0,
    currentCombo: 0,
    maxCombo: 0,
    mutationsDiscovered: 0,
    eventsSurvived: 0,
    speciesDistribution: { cyan: 0, coral: 0, yellow: 0, magenta: 0, violet: 0 },
  };

  private listeners: Set<EngineCallback> = new Set();

  constructor(playerSpecies: SpeciesId = 'cyan', seed?: number) {
    this.seed = seed ?? Math.floor(Math.random() * 1000000);
    this.prng = new PRNG(this.seed);
    this.world = new WorldManager(this.seed);
    this.playerSpecies = playerSpecies;

    // Start small: 3x3 colony around Core (0,0) -> Starting Territory 9
    this.world.initPlayerColony(this.playerSpecies);

    this.updateStats();
    this.generateUpcomingIntents();
    this.addLog(`Колония создана (Территория: 9). Защищайте Ядро!`, 'system');
  }

  public subscribe(cb: EngineCallback): () => void {
    this.listeners.add(cb);
    return () => this.listeners.delete(cb);
  }

  private notify() {
    this.listeners.forEach((cb) => cb());
  }

  public addLog(text: string, type: EventLogEntry['type']) {
    this.eventLogs.unshift({ turn: this.turn, text, type });
    if (this.eventLogs.length > 50) this.eventLogs.pop();
  }

  public getSpeciesPrediction(x: number, y: number): SpeciesPrediction {
    return this.world.getSpeciesPrediction(x, y);
  }

  public isAdjacentToPlayerTerritory(x: number, y: number): boolean {
    for (const [dx, dy] of DIRS8) {
      const nx = x + dx;
      const ny = y + dy;
      const neighbor = this.world.getExistingCell(nx, ny);
      if (neighbor && neighbor.revealed && neighbor.currentSpeciesId === this.playerSpecies) {
        return true;
      }
    }
    return false;
  }

  /**
   * Calculates local combat support attack probability (10% to 95%).
   * base 30% + 20% * adjacent_allies - 15% * adjacent_defenders
   */
  public getAttackChance(x: number, y: number): number {
    const targetCell = this.world.getExistingCell(x, y);
    if (!targetCell || !targetCell.revealed || targetCell.currentSpeciesId === this.playerSpecies || targetCell.isCore) {
      return 0;
    }

    let allySupport = 0;
    let defenderSupport = 0;

    for (const [dx, dy] of DIRS4) {
      const n = this.world.getExistingCell(x + dx, y + dy);
      if (n && n.revealed) {
        if (n.currentSpeciesId === this.playerSpecies) allySupport++;
        else if (n.currentSpeciesId === targetCell.currentSpeciesId) defenderSupport++;
      }
    }

    let chance = GAME_CONFIG.attackBaseChance + (allySupport * GAME_CONFIG.attackAllySupportBonus) - (defenderSupport * GAME_CONFIG.attackDefenderSupportPenalty);
    chance = Math.max(GAME_CONFIG.attackMinChance, Math.min(GAME_CONFIG.attackMaxChance, chance));
    return Math.round(chance * 100);
  }

  public getCurrentEra() {
    for (let i = GAME_CONFIG.eras.length - 1; i >= 0; i--) {
      if (this.turn >= GAME_CONFIG.eras[i].startTurn) {
        return GAME_CONFIG.eras[i];
      }
    }
    return GAME_CONFIG.eras[0];
  }

  public generateUpcomingIntents() {
    const era = this.getCurrentEra();
    this.activeIntents = SpreadSimulator.generateIntents(
      this.world,
      this.prng,
      this.strains,
      era.maxIntents,
      this.playerSpecies,
      this.coreX,
      this.coreY
    );
    this.validateAndCleanIntents();
  }

  public validateAndCleanIntents() {
    this.activeIntents = SpreadSimulator.validateIntents(this.activeIntents, this.world, this.playerSpecies);
    this.isCoreInDanger = this.activeIntents.some((i) => i.isThreatToCore);
  }

  // ACTION 1: REVEAL
  public revealCell(x: number, y: number): boolean {
    if (this.gameOver || this.gameWon) return false;
    const cell = this.world.getCell(x, y);
    if (!cell || cell.revealed) return false;

    if (!this.isAdjacentToPlayerTerritory(x, y)) return false;

    cell.revealed = true;
    cell.discoveredTurn = this.turn;

    const isPlayer = cell.naturalSpeciesId === this.playerSpecies;
    if (isPlayer) {
      cell.currentSpeciesId = this.playerSpecies;
    }

    this.animEvents = [];
    this.animEvents.push({ type: 'reveal', x, y, species: cell.currentSpeciesId, isPlayer });

    const initialKey = getCellKey(x, y);
    this.processTurn([initialKey]);
    return true;
  }

  // ACTION 2: ATTACK (BASIC COMBAT)
  public attackCell(x: number, y: number): boolean {
    if (this.gameOver || this.gameWon) return false;
    const cell = this.world.getCell(x, y);
    if (!cell || !cell.revealed || cell.currentSpeciesId === this.playerSpecies || cell.isCore) return false;

    if (!this.isAdjacentToPlayerTerritory(x, y)) return false;

    const chancePct = this.getAttackChance(x, y);
    const roll = this.prng.next() * 100;
    const success = roll < chancePct;

    this.animEvents = [];

    if (success) {
      cell.currentSpeciesId = this.playerSpecies;
      cell.lastChangedTurn = this.turn;
      cell.reinforcement = 1;
      this.animEvents.push({ type: 'attackSuccess', x, y, species: this.playerSpecies });
      this.addLog(`Атака на (${x},${y}) УСПЕШНА (${chancePct}%)!`, 'attack');
      const initialKey = getCellKey(x, y);
      this.processTurn([initialKey]);
    } else {
      this.animEvents.push({ type: 'attackFailure', x, y });
      this.addLog(`Атака на (${x},${y}) ОТБИТА (${chancePct}%)!`, 'attack');
      this.processTurn([]);
    }

    return true;
  }

  // ACTION 3: REPAINT (GUARANTEED CONVERSION)
  public repaintCell(x: number, y: number): boolean {
    if (this.gameOver || this.gameWon) return false;
    if (this.repaintCharges <= 0) return false;
    const cell = this.world.getCell(x, y);
    if (!cell || !cell.revealed || cell.isCore) return false;

    if (!this.isAdjacentToPlayerTerritory(x, y)) return false;

    cell.currentSpeciesId = this.playerSpecies;
    cell.strainId = undefined;
    cell.lastChangedTurn = this.turn;
    this.repaintCharges--;
    this.isRepaintMode = false;

    this.animEvents = [];
    const initialKey = getCellKey(x, y);
    this.addLog(`Перекраска клетки (${x},${y}) [R] (Осталось: ${this.repaintCharges}/3)`, 'repaint');
    this.processTurn([initialKey]);
    return true;
  }

  public toggleRepaintMode() {
    if (this.repaintCharges > 0) {
      this.isRepaintMode = !this.isRepaintMode;
      this.notify();
    }
  }

  private processTurn(dirtyCells: CellKey[]) {
    this.turn++;
    this.lastSquaresMatched = [];
    this.currentCombo = 0;

    // STEP 1: PLAYER SQUARES RESOLVE
    const chainQueue = [...dirtyCells];
    const processedSquares = new Set<string>();
    let safetyLimit = 20;

    while (chainQueue.length > 0 && safetyLimit > 0) {
      safetyLimit--;
      const candidateDirty = [...chainQueue];
      chainQueue.length = 0;

      const matches = SquareDetector.detectSquares(candidateDirty, this.world, this.strains);
      if (matches.length === 0) break;

      for (const match of matches) {
        const sqKey = `${match.minX}:${match.minY}:${match.size}`;
        if (processedSquares.has(sqKey)) continue;
        processedSquares.add(sqKey);

        this.currentCombo++;
        this.lastSquaresMatched.push(match);
        this.animEvents.push({ type: 'squareFill', match });

        // Auto-fill interior cells with reinforced armor
        const reinforcementVal = 3;
        for (const interiorKey of match.interiorCells) {
          const [ix, iy] = interiorKey.split(':').map(Number);
          const cell = this.world.getCell(ix, iy);
          cell.currentSpeciesId = match.speciesId;
          cell.revealed = true;
          cell.reinforcement = Math.max(cell.reinforcement, reinforcementVal);
          cell.lastChangedTurn = this.turn;
          chainQueue.push(interiorKey);
        }

        this.stats.totalSquaresCaptured++;
        this.stats.largestSquareSize = Math.max(this.stats.largestSquareSize, match.size);

        if (match.speciesId === this.playerSpecies) {
          // Restore +1 Repaint charge for 4x4+ squares (max 3)
          if (match.size >= 4 && this.repaintCharges < GAME_CONFIG.maxRepaints) {
            this.repaintCharges++;
            this.addLog(`Квадрат ${match.size}×${match.size}! +1 Заряд Перекраски [R] (${this.repaintCharges}/3)`, 'square');
          } else {
            this.addLog(`Захвачен квадрат ${match.size}×${match.size}!`, 'square');
          }
        }
      }
    }

    if (this.currentCombo > 1) {
      this.addLog(`КОМБО КАСКАД ×${this.currentCombo}!`, 'combo');
    }
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.currentCombo);

    // STEP 2: IMMEDIATE ZOMBIE INTENT CLEANUP
    this.validateAndCleanIntents();

    // STEP 3: ENEMY INTENTS RESOLVE SEQUENTIALLY
    const { anims, coreCaptured } = SpreadSimulator.resolveIntents(
      this.activeIntents,
      this.world,
      this.playerSpecies,
      this.coreX,
      this.coreY
    );

    for (const anim of anims) {
      this.animEvents.push(anim);
    }

    // CHECK SINGLE CORE CAPTURE LOSS CONDITION
    if (coreCaptured) {
      this.gameOver = true;
      this.animEvents.push({ type: 'gameOver' });
      this.addLog('ВАШЕ ЯДРО ВРАЖДЕБНО ЗАХВАЧЕНО! ПОРАЖЕНИЕ!', 'death');
    }

    // STEP 4: WORLD EVENT TELEGRAPH & TRIGGER
    const turnsUntilEvent = GAME_CONFIG.eventInterval - (this.turn % GAME_CONFIG.eventInterval);
    if (turnsUntilEvent === 2) {
      this.addLog(`⚠️ ВНИМАНИЕ: Через 2 хода произойдёт глобальная аномалия!`, 'event');
    }

    if (this.turn % GAME_CONFIG.eventInterval === 0) {
      const { event } = WorldEventManager.triggerEvent(
        this.turn, this.prng, this.world, this.strains, this.playerSpecies
      );
      this.lastEvent = event;
      this.stats.eventsSurvived++;
      this.addLog(`[СОБЫТИЕ] ${event.title}`, 'event');
      this.animEvents.push({ type: 'event', event });
    }

    // STEP 5: GENERATE NEW ENEMY INTENTS FOR NEXT TURN
    if (!this.gameOver && !this.gameWon) {
      this.generateUpcomingIntents();
    }

    this.updateStats();
    this.save();
    this.notify();
  }

  public updateStats() {
    this.stats.turnCount = this.turn;
    const counts: Record<SpeciesId, number> = { cyan: 0, coral: 0, yellow: 0, magenta: 0, violet: 0 };
    for (const chunk of this.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        // Territory counter counts actual OWNERSHIP of player cells!
        if (cell.currentSpeciesId === this.playerSpecies) {
          counts[this.playerSpecies]++;
        } else if (cell.revealed) {
          counts[cell.currentSpeciesId]++;
        }
      }
    }
    this.stats.speciesDistribution = counts;
    this.stats.playerTerritory = counts[this.playerSpecies] || 0;
    this.stats.maxPlayerTerritory = Math.max(this.stats.maxPlayerTerritory, this.stats.playerTerritory);
  }

  public save() {
    const revealedCells: Array<[number, number]> = [];
    const modifiedCells: SaveData['modifiedCells'] = [];
    for (const chunk of this.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        if (cell.revealed) revealedCells.push([cell.x, cell.y]);
        if (cell.currentSpeciesId !== cell.naturalSpeciesId || cell.reinforcement > 1 || cell.isCore) {
          modifiedCells.push({
            x: cell.x, y: cell.y,
            currentSpeciesId: cell.currentSpeciesId,
            strainId: cell.strainId,
            reinforcement: cell.reinforcement,
            revealed: cell.revealed,
            isCore: cell.isCore,
          });
        }
      }
    }
    SaveManager.save({
      version: 4, seed: this.seed, turn: this.turn,
      playerSpecies: this.playerSpecies,
      repaintCharges: this.repaintCharges,
      coreX: this.coreX, coreY: this.coreY,
      gameOver: this.gameOver,
      revealedCells, modifiedCells,
      strains: this.strains, stats: this.stats, eventLogs: this.eventLogs,
    });
  }

  public static loadFromSave(data: SaveData): GameEngine {
    const engine = new GameEngine(data.playerSpecies, data.seed);
    engine.turn = data.turn;
    engine.repaintCharges = data.repaintCharges;
    engine.coreX = data.coreX ?? 0;
    engine.coreY = data.coreY ?? 0;
    engine.gameOver = data.gameOver ?? false;
    engine.strains = data.strains || [];
    engine.stats = data.stats;
    engine.eventLogs = data.eventLogs || [];

    for (const [x, y] of data.revealedCells) {
      const cell = engine.world.getCell(x, y);
      cell.revealed = true;
    }
    for (const mod of data.modifiedCells) {
      const cell = engine.world.getCell(mod.x, mod.y);
      cell.currentSpeciesId = mod.currentSpeciesId;
      cell.strainId = mod.strainId;
      cell.reinforcement = mod.reinforcement;
      cell.revealed = mod.revealed;
      if (mod.isCore) cell.isCore = true;
    }
    engine.updateStats();
    engine.generateUpcomingIntents();
    return engine;
  }
}
