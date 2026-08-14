import type { SpeciesId } from './config';

export type CellKey = string;

export interface Cell {
  x: number;
  y: number;
  naturalSpeciesId: SpeciesId;
  currentSpeciesId: SpeciesId;
  claimed: boolean;
  revealed: boolean;
  strainId?: string;
  isCore?: boolean;
  reinforcement: number;
  discoveredTurn?: number;
  lastChangedTurn?: number;
  isSnapHidden?: boolean;
  obscuredUntilTurn?: number;
  blockedUntilTurn?: number;
  dormantUntilTurn?: number;
}

export type SecondaryTrait = 'swift' | 'armored' | 'parasite';

export interface Strain {
  id: string;
  speciesId: SpeciesId;
  name: string;
  trait: SecondaryTrait;
  traits?: SecondaryTrait[];
  parentSpeciesIds?: [SpeciesId, SpeciesId];
  colorHex: number;
  cssHex: string;
}

export interface DuelPickup {
  type: 'sporeBomb';
  x: number;
  y: number;
  spawnedRound: number;
}

export interface EnemyIntent {
  id: string;
  sourceCell: CellKey;
  sourceSpeciesId: SpeciesId;
  targetCell: CellKey;
  actionType: 'attack' | 'expand' | 'special';
  chance: number;
  createdTurn: number;
}

export interface SpeciesPrediction {
  likelySpecies: SpeciesId;
  confidencePercent: number;
  probabilities: Record<SpeciesId, number>;
}

export interface AttackPreview {
  chance: number;
  attackerSupport: number;
  defenderSupport: number;
}

export interface LegalActions {
  reveals: CellKey[];
  attacks: CellKey[];
  repaints: CellKey[];
}

export interface ActionResult {
  id: string;
  title: string;
  detail: string;
  tone: 'good' | 'bad' | 'neutral' | 'warning';
}

export interface SquareMatch {
  size: number;
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
  speciesId: SpeciesId;
  perimeterCells: CellKey[];
  interiorCells: CellKey[];
}

export type WorldEventType =
  | 'DENSE_FOG'
  | 'COSMIC_SNAP'
  | 'SPORE_RAIN'
  | 'BLOOM_TIDE'
  | 'DROUGHT'
  | 'MUTATION_SURGE'
  | 'DEAD_PATCH'
  | 'RESONANCE';

export interface WorldEvent {
  id: string;
  type: WorldEventType;
  title: string;
  description: string;
  targetSpeciesId?: SpeciesId;
  turn: number;
  duration: number;
  expiresTurn: number;
}

export interface EventLogEntry {
  turn: number;
  text: string;
  type: 'reveal' | 'attack' | 'repaint' | 'square' | 'combo' | 'event' | 'system' | 'intent' | 'death';
}

export interface GameStats {
  turnCount: number;
  playerTerritory: number;
  maxPlayerTerritory: number;
  enemiesCaptured: number;
  totalSquaresCaptured: number;
  largestSquareSize: number;
  currentCombo: number;
  maxCombo: number;
  mutationsDiscovered: number;
  eventsSurvived: number;
  speciesDistribution: Record<SpeciesId, number>;
}

export type GameAnimEvent =
  | { type: 'reveal'; x: number; y: number; species: SpeciesId; isPlayer: boolean }
  | { type: 'attackSuccess'; x: number; y: number; species: SpeciesId }
  | { type: 'attackFailure'; x: number; y: number }
  | { type: 'bombExplosion'; x: number; y: number }
  | { type: 'squareFill'; match: SquareMatch }
  | { type: 'spread'; fromX: number; fromY: number; toX: number; toY: number; species: SpeciesId }
  | { type: 'event'; event: WorldEvent }
  | { type: 'gameOver' };

export interface SavedCell {
  x: number;
  y: number;
  currentSpeciesId: SpeciesId;
  claimed: boolean;
  revealed: boolean;
  strainId?: string;
  reinforcement: number;
  isCore?: boolean;
  isSnapHidden?: boolean;
  obscuredUntilTurn?: number;
  blockedUntilTurn?: number;
  dormantUntilTurn?: number;
}

export interface SaveData {
  version: number;
  seed: number;
  rngState: number;
  turn: number;
  playerSpecies: SpeciesId;
  repaintCharges: number;
  coreX: number;
  coreY: number;
  gameOver: boolean;
  dailyKey?: string;
  cells: SavedCell[];
  strains: Strain[];
  activeIntents: EnemyIntent[];
  lastEvent: WorldEvent | null;
  stats: GameStats;
  eventLogs: EventLogEntry[];
}
