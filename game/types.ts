import { SpeciesId } from './config';

export type CellKey = string; // "x:y"

export interface Cell {
  x: number;
  y: number;
  naturalSpeciesId: SpeciesId;
  currentSpeciesId: SpeciesId;
  strainId?: string;
  revealed: boolean;
  isCore?: boolean;
  reinforcement: number;
  discoveredTurn?: number;
  lastChangedTurn?: number;
  isSnapHidden?: boolean;
}

export type SecondaryTrait = 'fast' | 'armored' | 'parasite';

export interface Strain {
  id: string;
  speciesId: SpeciesId;
  name: string;
  trait: SecondaryTrait;
  colorHex: number;
  cssHex: string;
}

export interface EnemyIntent {
  id: string;
  sourceX: number;
  sourceY: number;
  sourceSpecies: SpeciesId;
  toX: number;
  toY: number;
  isThreatToCore: boolean;
}

export interface SpeciesPrediction {
  likelySpecies: SpeciesId;
  confidencePercent: number;
  probabilities: Record<SpeciesId, number>;
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
  duration?: number;
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
  | { type: 'squareFill'; match: SquareMatch }
  | { type: 'spread'; fromX: number; fromY: number; toX: number; toY: number; species: SpeciesId }
  | { type: 'event'; event: WorldEvent }
  | { type: 'gameOver' };

export interface SaveData {
  version: number;
  seed: number;
  turn: number;
  playerSpecies: SpeciesId;
  repaintCharges: number;
  coreX: number;
  coreY: number;
  gameOver: boolean;
  revealedCells: Array<[number, number]>;
  modifiedCells: Array<{
    x: number;
    y: number;
    currentSpeciesId: SpeciesId;
    strainId?: string;
    reinforcement: number;
    revealed: boolean;
    isCore?: boolean;
  }>;
  strains: Strain[];
  stats: GameStats;
  eventLogs: EventLogEntry[];
}
