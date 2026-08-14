import { GAME_CONFIG, type SpeciesId } from './config';
import { EVENT_COPY, WorldEventManager } from './events';
import { PRNG } from './rng';
import { RecordManager } from './records';
import { SaveManager, SAVE_VERSION } from './save';
import { SpreadSimulator } from './spread';
import { SquareDetector } from './squares';
import type {
  AttackPreview,
  ActionResult,
  CellKey,
  EnemyIntent,
  EventLogEntry,
  GameAnimEvent,
  GameStats,
  LegalActions,
  SaveData,
  SpeciesPrediction,
  SquareMatch,
  Strain,
  WorldEvent,
  WorldEventType,
} from './types';
import { getCellKey, parseCellKey, WorldManager } from './world';

export type EngineCallback = () => void;

const DIRS8: Array<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

function randomSeed(): number {
  if (typeof crypto !== 'undefined' && 'getRandomValues' in crypto) {
    return crypto.getRandomValues(new Uint32Array(1))[0];
  }
  return (Date.now() ^ 0x9e3779b9) >>> 0;
}

function emptyStats(): GameStats {
  return {
    turnCount: 1,
    playerTerritory: 9,
    maxPlayerTerritory: 9,
    enemiesCaptured: 0,
    totalSquaresCaptured: 0,
    largestSquareSize: 0,
    currentCombo: 0,
    maxCombo: 0,
    mutationsDiscovered: 0,
    eventsSurvived: 0,
    speciesDistribution: { cyan: 0, coral: 0, yellow: 0, magenta: 0, violet: 0 },
  };
}

export class GameEngine {
  public seed: number;
  public prng: PRNG;
  public world: WorldManager;
  public turn = 1;
  public repaintCharges: number = GAME_CONFIG.startingRepaints;
  public isRepaintMode = false;
  public coreX = 0;
  public coreY = 0;
  public enemyCoreX: number | null = null;
  public enemyCoreY: number | null = null;
  public gameOver = false;
  public gameWon = false;
  public strains: Strain[] = [];
  public currentCombo = 0;
  public activeIntents: EnemyIntent[] = [];
  public isCoreInDanger = false;
  public lastEvent: WorldEvent | null = null;
  public eventWarning: string | null = null;
  public lastSquaresMatched: SquareMatch[] = [];
  public eventLogs: EventLogEntry[] = [];
  public animEvents: GameAnimEvent[] = [];
  public stats = emptyStats();
  public tutorialMode = false;
  public tutorialTarget: CellKey | null = null;
  public lastAction: 'reveal' | 'attack' | 'repaint' | null = null;
  public suppressAi = false;
  public dailyKey: string | undefined;
  public multiplayerMode = false;
  public lastResult: ActionResult | null = null;
  private resultSequence = 0;

  private listeners = new Set<EngineCallback>();

  constructor(public playerSpecies: SpeciesId = 'cyan', seed = randomSeed()) {
    this.seed = seed >>> 0;
    this.prng = new PRNG(this.seed);
    this.world = new WorldManager(this.seed);
    this.world.initPlayerColony(playerSpecies);
    if (playerSpecies === 'violet') {
      for (const [dx, dy] of DIRS8) this.world.getCell(dx, dy).reinforcement = 2;
      this.world.getCell(0, 0).reinforcement = 3;
    }
    this.updateStats();
    this.addLog('Новая колония пробуждается в Чёрном Субстрате.', 'system');
  }

  public subscribe(callback: EngineCallback): () => void {
    this.listeners.add(callback);
    return () => this.listeners.delete(callback);
  }

  private notify() {
    for (const listener of this.listeners) listener();
  }

  public refresh(validateIntents = true) {
    this.updateStats();
    if (validateIntents) this.validateAndCleanIntents();
    this.notify();
  }

  public addLog(text: string, type: EventLogEntry['type']) {
    this.eventLogs.unshift({ turn: this.turn, text, type });
    this.eventLogs = this.eventLogs.slice(0, 40);
  }

  private setResult(title: string, detail: string, tone: ActionResult['tone']) {
    this.lastResult = { id: `${this.turn}:${++this.resultSequence}`, title, detail, tone };
  }

  public getSpeciesPrediction(x: number, y: number): SpeciesPrediction {
    const prediction = this.world.getSpeciesPrediction(x, y);
    if (this.playerSpecies === 'yellow' && this.turn % 3 === 0 && this.getSenseTargetKey() === getCellKey(x, y)) {
      const actual = this.world.getCell(x, y).naturalSpeciesId;
      const others = (Object.keys(prediction.probabilities) as SpeciesId[]).filter((id) => id !== actual);
      prediction.probabilities[actual] = 85;
      let remaining = 15;
      for (let i = 0; i < others.length; i++) {
        const value = i === others.length - 1 ? remaining : Math.max(1, Math.round(15 / others.length));
        prediction.probabilities[others[i]] = value;
        remaining -= value;
      }
      prediction.likelySpecies = actual;
      prediction.confidencePercent = 85;
    }
    return prediction;
  }

  public getSenseTargetKey(): CellKey | null {
    if (this.playerSpecies !== 'yellow' || this.turn % 3 !== 0) return null;
    const frontier = new Set<CellKey>();
    for (const chunk of this.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        if (!cell.claimed || cell.currentSpeciesId !== this.playerSpecies) continue;
        for (const [dx, dy] of DIRS8) {
          const neighbor = this.world.getCell(cell.x + dx, cell.y + dy);
          if (!neighbor.claimed && !neighbor.revealed) frontier.add(getCellKey(neighbor.x, neighbor.y));
        }
      }
    }
    const ordered = [...frontier].sort((a, b) => {
      const [ax, ay] = parseCellKey(a); const [bx, by] = parseCellKey(b);
      return ax - bx || ay - by;
    });
    if (!ordered.length) return null;
    const mixed = (this.seed ^ Math.imul(this.turn, 0x9e3779b1)) >>> 0;
    return ordered[mixed % ordered.length];
  }

  public isAdjacentToPlayerTerritory(x: number, y: number): boolean {
    return DIRS8.some(([dx, dy]) => {
      const cell = this.world.getExistingCell(x + dx, y + dy);
      return !!cell?.claimed && cell.currentSpeciesId === this.playerSpecies;
    });
  }

  public getAttackPreview(x: number, y: number): AttackPreview {
    const target = this.world.getExistingCell(x, y);
    const enemyCore = target?.isCore && x === this.enemyCoreX && y === this.enemyCoreY;
    if (!target?.claimed || !target.revealed || target.isSnapHidden || target.currentSpeciesId === this.playerSpecies || (target.isCore && !enemyCore) || !this.isAdjacentToPlayerTerritory(x, y)) {
      return { chance: 0, attackerSupport: 0, defenderSupport: 0 };
    }
    let attackerSupport = 0;
    let defenderSupport = 0;
    for (const [dx, dy] of DIRS8) {
      const cell = this.world.getExistingCell(x + dx, y + dy);
      if (!cell?.claimed) continue;
      if (cell.currentSpeciesId === this.playerSpecies) attackerSupport++;
      if (cell.currentSpeciesId === target.currentSpeciesId) defenderSupport++;
    }
    let chance = GAME_CONFIG.attackBaseChance
      + Math.max(0, attackerSupport - 1) * GAME_CONFIG.attackAllySupportBonus
      - Math.max(0, defenderSupport - 1) * GAME_CONFIG.attackDefenderSupportPenalty;
    if (target.reinforcement > 2) chance -= 0.25;
    else if (target.reinforcement > 1) chance -= 0.15;
    if (target.strainId && this.strains.find((strain) => strain.id === target.strainId)?.trait === 'armored') chance -= 0.1;
    if (this.playerSpecies === 'coral' && defenderSupport <= 1) chance += 0.1;
    chance = Math.max(GAME_CONFIG.attackMinChance, Math.min(GAME_CONFIG.attackMaxChance, chance));
    return { chance: Math.round(chance * 100), attackerSupport, defenderSupport };
  }

  public getAttackChance(x: number, y: number): number {
    return this.getAttackPreview(x, y).chance;
  }

  public getCurrentEra() {
    for (let i = GAME_CONFIG.eras.length - 1; i >= 0; i--) {
      if (this.turn >= GAME_CONFIG.eras[i].startTurn) return GAME_CONFIG.eras[i];
    }
    return GAME_CONFIG.eras[0];
  }

  public getTurnsUntilEvent(): number {
    const remainder = this.turn % GAME_CONFIG.eventInterval;
    return remainder === 0 ? GAME_CONFIG.eventInterval : GAME_CONFIG.eventInterval - remainder;
  }

  private getScheduledEventType(turn: number): WorldEventType {
    const types = Object.keys(EVENT_COPY) as WorldEventType[];
    const mixed = (this.seed ^ Math.imul(turn, 0x45d9f3b)) >>> 0;
    return types[mixed % types.length];
  }

  public generateUpcomingIntents() {
    if (this.suppressAi) {
      this.activeIntents = [];
      this.isCoreInDanger = false;
      return;
    }
    const eventActive = this.lastEvent && this.lastEvent.expiresTurn >= this.turn ? this.lastEvent : null;
    const maxIntents: number = this.getCurrentEra().maxIntents;
    this.activeIntents = SpreadSimulator.generateIntents(
      this.world,
      this.prng,
      this.strains,
      maxIntents,
      this.playerSpecies,
      this.turn,
      this.coreX,
      this.coreY,
      {
        bonusSpecies: eventActive?.type === 'BLOOM_TIDE' ? eventActive.targetSpeciesId : undefined,
        drought: eventActive?.type === 'DROUGHT',
      },
    );
    this.validateAndCleanIntents();
  }

  public validateAndCleanIntents() {
    this.activeIntents = SpreadSimulator.validateIntents(this.activeIntents, this.world, this.playerSpecies, this.turn);
    const coreKey = getCellKey(this.coreX, this.coreY);
    this.isCoreInDanger = this.activeIntents.some((intent) => intent.targetCell === coreKey);
  }

  public validateDuelIntents(opponentSpecies: SpeciesId) {
    this.activeIntents = SpreadSimulator.validateIntents(this.activeIntents, this.world, this.playerSpecies, this.turn, [this.playerSpecies, opponentSpecies]);
    this.isCoreInDanger = this.activeIntents.some((intent) => intent.targetCell === getCellKey(this.coreX, this.coreY));
  }

  public inspectObscuredCell(x: number, y: number): boolean {
    const cell = this.world.getExistingCell(x, y);
    if (!cell?.claimed || !cell.isSnapHidden) return false;
    // Dense Fog is a timed tactical effect. Only Cosmic Snap memories can be
    // restored with a free inspection.
    if (cell.obscuredUntilTurn && cell.obscuredUntilTurn >= this.turn) return false;
    cell.isSnapHidden = false;
    this.setResult('Память восстановлена', 'Космический щелчок скрыл восприятие, но не владение. Осмотр не потратил ход.', 'neutral');
    this.notify();
    return true;
  }

  public revealCell(x: number, y: number): boolean {
    if (this.gameOver || this.gameWon) return false;
    if (this.inspectObscuredCell(x, y)) return true;
    if (this.tutorialMode && this.tutorialTarget && this.tutorialTarget !== getCellKey(x, y)) return false;
    const cell = this.world.getCell(x, y);
    if (cell.claimed || cell.revealed || !this.isAdjacentToPlayerTerritory(x, y)) return false;
    if (cell.blockedUntilTurn && cell.blockedUntilTurn >= this.turn) return false;
    cell.revealed = true;
    cell.claimed = true;
    cell.discoveredTurn = this.turn;
    cell.lastChangedTurn = this.turn;
    const isPlayer = cell.naturalSpeciesId === this.playerSpecies;
    cell.currentSpeciesId = cell.naturalSpeciesId;
    this.animEvents = [{ type: 'reveal', x, y, species: cell.currentSpeciesId, isPlayer }];
    this.lastAction = 'reveal';
    this.addLog(isPlayer ? 'Фронтир присоединился к вашей колонии.' : `Обнаружено семейство: ${GAME_CONFIG.colors.species[cell.currentSpeciesId].name}.`, 'reveal');
    this.setResult(
      isPlayer ? 'Колония помнит вас' : `Раскрыто: ${GAME_CONFIG.colors.species[cell.currentSpeciesId].name}`,
      isPlayer ? 'Территория +1. Новая клетка поддерживает атаки и замыкает квадраты.' : 'Враждебный рост пробудился. Его важное движение будет показано заранее.',
      isPlayer ? 'good' : 'warning',
    );
    this.processTurn([getCellKey(x, y)]);
    return true;
  }

  public attackCell(x: number, y: number): boolean {
    if (this.gameOver || this.gameWon) return false;
    if (this.tutorialMode && this.tutorialTarget && this.tutorialTarget !== getCellKey(x, y)) return false;
    const preview = this.getAttackPreview(x, y);
    if (preview.chance <= 0) return false;
    const cell = this.world.getCell(x, y);
    const success = this.tutorialMode || this.prng.next() * 100 < preview.chance;
    this.lastAction = 'attack';
    this.animEvents = [];
    if (success) {
      cell.currentSpeciesId = this.playerSpecies;
      cell.claimed = true;
      cell.revealed = true;
      cell.strainId = undefined;
      cell.reinforcement = this.playerSpecies === 'violet' && Math.max(Math.abs(x - this.coreX), Math.abs(y - this.coreY)) === 1 ? 2 : 1;
      cell.lastChangedTurn = this.turn;
      this.stats.enemiesCaptured++;
      this.animEvents.push({ type: 'attackSuccess', x, y, species: this.playerSpecies });
      if (cell.isCore && x === this.enemyCoreX && y === this.enemyCoreY) this.gameWon = true;
      this.addLog(`Атака успешна · ${preview.chance}%`, 'attack');
      this.setResult('Атака закрепилась', `${preview.chance}% · поддержка союзников: ${preview.attackerSupport}, защитников: ${preview.defenderSupport}.`, 'good');
      this.processTurn([getCellKey(x, y)]);
    } else {
      this.animEvents.push({ type: 'attackFailure', x, y });
      this.addLog(`Атака провалилась · ${preview.chance}%`, 'attack');
      this.setResult('Цель устояла', `${preview.chance}% · ход потрачен, расположение поддержки не изменилось.`, 'bad');
      this.processTurn([]);
    }
    return true;
  }

  public repaintCell(x: number, y: number): boolean {
    if (this.gameOver || this.gameWon || this.repaintCharges <= 0) return false;
    if (this.tutorialMode && this.tutorialTarget && this.tutorialTarget !== getCellKey(x, y)) return false;
    const cell = this.world.getExistingCell(x, y);
    if (!cell?.claimed || !cell.revealed || cell.isSnapHidden || cell.isCore || cell.currentSpeciesId === this.playerSpecies) return false;
    if (!this.isAdjacentToPlayerTerritory(x, y)) return false;
    cell.currentSpeciesId = this.playerSpecies;
    cell.strainId = undefined;
    cell.reinforcement = this.playerSpecies === 'magenta' || (this.playerSpecies === 'violet' && Math.max(Math.abs(x - this.coreX), Math.abs(y - this.coreY)) === 1) ? 2 : 1;
    cell.lastChangedTurn = this.turn;
    this.repaintCharges--;
    this.lastAction = 'repaint';
    this.isRepaintMode = false;
    this.stats.enemiesCaptured++;
    this.animEvents = [{ type: 'attackSuccess', x, y, species: this.playerSpecies }];
    this.addLog(`Гарантированный захват Перекраской · ${this.repaintCharges}/3`, 'repaint');
    this.setResult('Перекраска прижилась', `Гарантированный захват · осталось зарядов: ${this.repaintCharges}/3.`, 'good');
    this.processTurn([getCellKey(x, y)]);
    return true;
  }

  public toggleRepaintMode() {
    if (this.repaintCharges > 0 && !this.gameOver) {
      this.isRepaintMode = !this.isRepaintMode;
      this.notify();
    }
  }

  public getLegalActions(): LegalActions {
    const reveals = new Set<CellKey>();
    const attacks = new Set<CellKey>();
    const repaints = new Set<CellKey>();
    for (const chunk of this.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        if (!cell.claimed || cell.currentSpeciesId !== this.playerSpecies) continue;
        for (const [dx, dy] of DIRS8) {
          const neighbor = this.world.getCell(cell.x + dx, cell.y + dy);
          const key = getCellKey(neighbor.x, neighbor.y);
          if (!neighbor.claimed && (!neighbor.blockedUntilTurn || neighbor.blockedUntilTurn < this.turn)) reveals.add(key);
          const enemyCore = neighbor.isCore && neighbor.x === this.enemyCoreX && neighbor.y === this.enemyCoreY;
          if (neighbor.claimed && neighbor.revealed && !neighbor.isSnapHidden && neighbor.currentSpeciesId !== this.playerSpecies && (!neighbor.isCore || enemyCore)) {
            attacks.add(key);
            if (this.repaintCharges > 0 && !neighbor.isCore) repaints.add(key);
          }
        }
      }
    }
    return { reveals: [...reveals].sort(), attacks: [...attacks].sort(), repaints: [...repaints].sort() };
  }

  public previewCompletedSquare(x: number, y: number, assumePlayer = true): number {
    const cell = this.world.getCell(x, y);
    const previous = { claimed: cell.claimed, revealed: cell.revealed, species: cell.currentSpeciesId };
    if (assumePlayer) {
      cell.claimed = true;
      cell.revealed = true;
      cell.currentSpeciesId = this.playerSpecies;
    }
    const size = SquareDetector.detectSquares([getCellKey(x, y)], this.world, this.strains)
      .filter((match) => match.speciesId === this.playerSpecies)
      .reduce((max, match) => Math.max(max, match.size), 0);
    cell.claimed = previous.claimed;
    cell.revealed = previous.revealed;
    cell.currentSpeciesId = previous.species;
    return size;
  }

  private resolveSquares(initial: CellKey[]): CellKey[] {
    const changed: CellKey[] = [];
    let queue = [...new Set(initial)].sort();
    const processed = new Set<string>();
    let safety = 32;
    while (queue.length && safety-- > 0) {
      const matches = SquareDetector.detectSquares(queue, this.world, this.strains);
      queue = [];
      for (const match of matches) {
        const id = `${match.speciesId}:${match.minX}:${match.minY}:${match.size}`;
        if (processed.has(id)) continue;
        if (match.interiorCells.some((key) => {
          const [x, y] = parseCellKey(key);
          const blocked = this.world.getCell(x, y).blockedUntilTurn;
          return !!blocked && blocked >= this.turn;
        })) continue;
        processed.add(id);
        const isPlayerSquare = match.speciesId === this.playerSpecies;
        if (isPlayerSquare) this.currentCombo++;
        this.lastSquaresMatched.push(match);
        this.animEvents.push({ type: 'squareFill', match });
        for (const key of match.interiorCells) {
          const [x, y] = parseCellKey(key);
          const cell = this.world.getCell(x, y);
          const altered = !cell.claimed || cell.currentSpeciesId !== match.speciesId || cell.reinforcement < 2;
          cell.currentSpeciesId = match.speciesId;
          cell.claimed = true;
          cell.revealed = true;
          cell.isSnapHidden = false;
          cell.reinforcement = Math.max(cell.reinforcement, match.speciesId === 'cyan' ? 3 : 2);
          cell.lastChangedTurn = this.turn;
          if (altered) {
            queue.push(key);
            changed.push(key);
          }
        }
        if (isPlayerSquare) {
          this.stats.totalSquaresCaptured++;
          this.stats.largestSquareSize = Math.max(this.stats.largestSquareSize, match.size);
        }
        if (isPlayerSquare && match.size >= 4) {
          const resonance = this.lastEvent?.type === 'RESONANCE' && this.lastEvent.expiresTurn >= this.turn;
          this.repaintCharges = Math.min(GAME_CONFIG.maxRepaints, this.repaintCharges + (resonance ? 2 : 1));
          if (resonance && this.lastEvent) this.lastEvent.expiresTurn = this.turn - 1;
        }
      }
      queue = [...new Set(queue)].sort();
    }
    return changed;
  }

  private checkTerminalState() {
    if (this.gameOver || this.gameWon) return;
    const core = this.world.getCell(this.coreX, this.coreY);
    if (core.currentSpeciesId !== this.playerSpecies) {
      this.gameOver = true;
      this.gameWon = false;
      this.isCoreInDanger = false;
      this.animEvents.push({ type: 'gameOver' });
      this.addLog('Ваше Ядро захвачено.', 'death');
      this.setResult('Ядро захвачено', 'Враждебная колония добралась до единственной клетки, способной завершить партию.', 'bad');
    }
    if (this.enemyCoreX !== null && this.enemyCoreY !== null) {
      const enemyCore = this.world.getCell(this.enemyCoreX, this.enemyCoreY);
      if (enemyCore.currentSpeciesId === this.playerSpecies) {
        this.gameWon = true;
        this.gameOver = false;
        this.setResult('Ядро соперника захвачено', 'Вы выиграли дуэль разумов.', 'good');
      }
    }
  }

  private processTurn(dirtyCells: CellKey[]) {
    this.lastSquaresMatched = [];
    this.currentCombo = 0;
    this.resolveSquares(dirtyCells);
    this.checkTerminalState();
    if (this.gameOver || this.gameWon) {
      this.turn++;
      this.updateStats();
      if (!this.multiplayerMode) RecordManager.update(this.stats, this.dailyKey);
      this.save();
      this.notify();
      return;
    }
    if (!this.multiplayerMode) this.validateAndCleanIntents();

    const hostileIntentCount = this.multiplayerMode ? 0 : this.activeIntents.length;
    const resolution = this.suppressAi
      ? { changedCells: [] as CellKey[], anims: [] as GameAnimEvent[], coreCaptured: false }
      : SpreadSimulator.resolveIntents(
        this.activeIntents,
        this.world,
        this.prng,
        this.playerSpecies,
        this.coreX,
        this.coreY,
        this.turn,
        (key) => {
          this.resolveSquares([key]);
          this.checkTerminalState();
          return this.gameOver || this.gameWon;
        },
      );
    this.animEvents.push(...resolution.anims);
    if (!this.multiplayerMode) this.activeIntents = [];
    this.checkTerminalState();

    this.turn++;
    this.stats.currentCombo = this.currentCombo;
    this.stats.maxCombo = Math.max(this.stats.maxCombo, this.currentCombo);
    if (this.currentCombo > 0 && !this.gameOver && !this.gameWon) {
      const largest = this.lastSquaresMatched.filter((square) => square.speciesId === this.playerSpecies).reduce((max, square) => Math.max(max, square.size), 0);
      const pressure = hostileIntentCount ? ` · вражеское давление ${resolution.anims.length ? 'продвинулось' : 'сдержано'}` : '';
      this.setResult(`Квадрат ${largest}×${largest}${this.currentCombo > 1 ? ` · цепочка ×${this.currentCombo}` : ''}`, `Внутренность укреплена${largest >= 4 ? ' · Перекраска восстановлена' : ''}${pressure}.`, 'good');
    } else if (hostileIntentCount > 0 && !this.gameOver && !this.gameWon) {
      const successes = resolution.anims.length;
      const failures = hostileIntentCount - successes;
      this.setResult(
        successes ? 'Враждебное давление продвинулось' : 'Фронтир устоял',
        `Успешных намерений: ${successes}${failures > 0 ? ` · сорвано: ${failures}` : ''}. Изучите следующие отростки до своего решения.`,
        successes ? 'warning' : 'neutral',
      );
      this.addLog(successes ? `Разрешено враждебных намерений: ${successes}.` : 'Враждебные намерения не смогли закрепиться.', 'intent');
    }
    if (this.currentCombo > 1) this.addLog(`Цепочка ×${this.currentCombo}`, 'combo');

    for (const chunk of this.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        if (cell.obscuredUntilTurn && cell.obscuredUntilTurn < this.turn) {
          cell.isSnapHidden = false;
          cell.obscuredUntilTurn = undefined;
        }
        if (cell.blockedUntilTurn && cell.blockedUntilTurn < this.turn) {
          cell.blockedUntilTurn = undefined;
          if (!cell.claimed) cell.revealed = false;
        }
        if (cell.dormantUntilTurn && cell.dormantUntilTurn <= this.turn) {
          cell.dormantUntilTurn = undefined;
          this.addLog(`Спора семейства «${GAME_CONFIG.colors.species[cell.currentSpeciesId].name}» пробудилась.`, 'event');
        }
      }
    }

    if (!this.gameOver && !this.multiplayerMode && this.turn % GAME_CONFIG.eventInterval === 0) {
      const { event } = WorldEventManager.triggerEvent(this.turn, this.prng, this.world, this.strains, this.playerSpecies, this.getScheduledEventType(this.turn));
      this.lastEvent = event;
      this.stats.eventsSurvived++;
      this.addLog(event.title, 'event');
      this.animEvents.push({ type: 'event', event });
    }

    const turnsUntilEvent = this.getTurnsUntilEvent();
    const eventTurn = this.turn + turnsUntilEvent;
    this.eventWarning = turnsUntilEvent <= 2 ? `${EVENT_COPY[this.getScheduledEventType(eventTurn)][0]} · через ходов: ${turnsUntilEvent}` : null;
    if (!this.multiplayerMode) this.validateAndCleanIntents();
    if (!this.gameOver && !this.suppressAi) this.generateUpcomingIntents();
    this.updateStats();
    if (!this.multiplayerMode) RecordManager.update(this.stats, this.dailyKey);
    this.save();
    this.notify();
  }

  public updateStats() {
    const counts: Record<SpeciesId, number> = { cyan: 0, coral: 0, yellow: 0, magenta: 0, violet: 0 };
    for (const chunk of this.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        if (cell.claimed) counts[cell.currentSpeciesId]++;
      }
    }
    this.stats.turnCount = this.turn;
    this.stats.speciesDistribution = counts;
    this.stats.playerTerritory = counts[this.playerSpecies];
    this.stats.maxPlayerTerritory = Math.max(this.stats.maxPlayerTerritory, this.stats.playerTerritory);
    this.stats.mutationsDiscovered = this.strains.length;
  }

  public save() {
    if (this.tutorialMode || this.multiplayerMode) return;
    const cells: SaveData['cells'] = [];
    for (const chunk of this.world.getLoadedChunks()) {
      for (const cell of chunk.cells.values()) {
        if (!cell.claimed && !cell.revealed && !cell.isSnapHidden && !cell.blockedUntilTurn) continue;
        cells.push({
          x: cell.x,
          y: cell.y,
          currentSpeciesId: cell.currentSpeciesId,
          claimed: cell.claimed,
          revealed: cell.revealed,
          strainId: cell.strainId,
          reinforcement: cell.reinforcement,
          isCore: cell.isCore,
          isSnapHidden: cell.isSnapHidden,
          obscuredUntilTurn: cell.obscuredUntilTurn,
          blockedUntilTurn: cell.blockedUntilTurn,
          dormantUntilTurn: cell.dormantUntilTurn,
        });
      }
    }
    SaveManager.save({
      version: SAVE_VERSION,
      seed: this.seed,
      rngState: this.prng.getState(),
      turn: this.turn,
      playerSpecies: this.playerSpecies,
      repaintCharges: this.repaintCharges,
      coreX: this.coreX,
      coreY: this.coreY,
      gameOver: this.gameOver,
      dailyKey: this.dailyKey,
      cells,
      strains: this.strains,
      activeIntents: this.activeIntents,
      lastEvent: this.lastEvent,
      stats: this.stats,
      eventLogs: this.eventLogs,
    });
  }

  public static loadFromSave(data: SaveData): GameEngine {
    const engine = new GameEngine(data.playerSpecies, data.seed);
    engine.turn = data.turn;
    engine.repaintCharges = Math.max(0, Math.min(GAME_CONFIG.maxRepaints, data.repaintCharges));
    engine.coreX = data.coreX;
    engine.coreY = data.coreY;
    engine.gameOver = data.gameOver;
    engine.prng.setState(data.rngState ?? data.seed);
    engine.dailyKey = data.dailyKey;
    engine.strains = data.strains ?? [];
    engine.stats = { ...emptyStats(), ...data.stats };
    engine.eventLogs = data.eventLogs ?? [];
    engine.lastEvent = data.lastEvent ?? null;
    for (const saved of data.cells) {
      const cell = engine.world.getCell(saved.x, saved.y);
      Object.assign(cell, saved);
    }
    engine.activeIntents = data.activeIntents ?? [];
    engine.validateAndCleanIntents();
    engine.updateStats();
    const turnsUntilEvent = engine.getTurnsUntilEvent();
    const eventTurn = engine.turn + turnsUntilEvent;
    engine.eventWarning = turnsUntilEvent <= 2 ? `${EVENT_COPY[engine.getScheduledEventType(eventTurn)][0]} · через ходов: ${turnsUntilEvent}` : null;
    engine.lastResult = { id: `load:${engine.turn}`, title: 'Колония восстановлена', detail: 'Намерения и мир продолжены ровно с момента сохранения.', tone: 'neutral' };
    return engine;
  }

  public resolveDuelRound(round: number, opponentSpecies: SpeciesId) {
    if (!this.multiplayerMode || this.gameOver || this.gameWon) return;
    const players = [this.playerSpecies, opponentSpecies];
    const pending = [...this.activeIntents];
    this.activeIntents = [];
    if (pending.length) {
      const resolution = SpreadSimulator.resolveIntents(
        pending,
        this.world,
        this.prng,
        this.playerSpecies,
        this.coreX,
        this.coreY,
        this.turn,
        (key) => {
          this.resolveSquares([key]);
          const ownCoreAlive = this.world.getCell(this.coreX, this.coreY).currentSpeciesId === this.playerSpecies;
          const rivalCoreAlive = this.enemyCoreX === null || this.enemyCoreY === null || this.world.getCell(this.enemyCoreX, this.enemyCoreY).currentSpeciesId === opponentSpecies;
          return !ownCoreAlive || !rivalCoreAlive;
        },
        players,
      );
      this.animEvents.push(...resolution.anims);
      const failed = pending.length - resolution.anims.length;
      this.setResult(
        resolution.anims.length ? 'Нейтральное давление продвинулось' : 'Обе колонии устояли',
        `Сработало нейтральных намерений: ${resolution.anims.length}${failed ? ` · сорвано: ${failed}` : ''}.`,
        resolution.anims.length ? 'warning' : 'neutral',
      );
    }
    if (round % 5 === 0) {
      const { event } = WorldEventManager.triggerEvent(this.turn, this.prng, this.world, this.strains, this.playerSpecies, this.getScheduledEventType(this.turn), [opponentSpecies]);
      this.lastEvent = event;
      this.stats.eventsSurvived++;
      this.animEvents.push({ type: 'event', event });
      this.addLog(`${event.title} · раунд дуэли ${round}`, 'event');
      this.setResult(event.title, 'Субстрат отвечает после хода обеих колоний.', 'warning');
    }
    this.checkTerminalState();
    if (!this.gameOver && !this.gameWon) {
      const eventActive = this.lastEvent && this.lastEvent.expiresTurn >= this.turn ? this.lastEvent : null;
      this.activeIntents = SpreadSimulator.generateIntents(
        this.world,
        this.prng,
        this.strains,
        Math.max(1, this.getCurrentEra().maxIntents),
        this.playerSpecies,
        this.turn,
        this.coreX,
        this.coreY,
        {
          bonusSpecies: eventActive?.type === 'BLOOM_TIDE' ? eventActive.targetSpeciesId : undefined,
          drought: eventActive?.type === 'DROUGHT',
          excludedSourceSpecies: players,
          attackableSpecies: players,
        },
      );
      this.isCoreInDanger = this.activeIntents.some((intent) => intent.targetCell === getCellKey(this.coreX, this.coreY));
    }
    this.updateStats();
    this.notify();
  }
}
