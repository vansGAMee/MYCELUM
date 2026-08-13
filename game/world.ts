import { GAME_CONFIG, type SpeciesId } from './config';
import { create2DNoise } from './rng';
import type { Cell, SpeciesPrediction } from './types';

export const SPECIES_LIST: SpeciesId[] = ['cyan', 'coral', 'yellow', 'magenta', 'violet'];

export function getCellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function parseCellKey(key: string): [number, number] {
  const [x, y] = key.split(':').map(Number);
  return [x, y];
}

type SpeciesResolver = (x: number, y: number) => SpeciesId;

export class Chunk {
  public cells = new Map<string, Cell>();

  constructor(public cx: number, public cy: number, speciesAt: SpeciesResolver) {
    const startX = cx * GAME_CONFIG.chunkSize;
    const startY = cy * GAME_CONFIG.chunkSize;
    for (let lx = 0; lx < GAME_CONFIG.chunkSize; lx++) {
      for (let ly = 0; ly < GAME_CONFIG.chunkSize; ly++) {
        const x = startX + lx;
        const y = startY + ly;
        const naturalSpeciesId = speciesAt(x, y);
        this.cells.set(getCellKey(x, y), {
          x,
          y,
          naturalSpeciesId,
          currentSpeciesId: naturalSpeciesId,
          claimed: false,
          revealed: false,
          reinforcement: 1,
        });
      }
    }
  }
}

export class WorldManager {
  private chunks = new Map<string, Chunk>();
  private biomeNoise: Array<(x: number, y: number) => number>;

  constructor(public seed: number) {
    this.biomeNoise = SPECIES_LIST.map((_, index) => create2DNoise(seed + 9719 * (index + 1)));
  }

  private speciesAt = (x: number, y: number): SpeciesId => {
    let best = -Infinity;
    let selected = SPECIES_LIST[0];
    for (let i = 0; i < SPECIES_LIST.length; i++) {
      const broad = this.biomeNoise[i](x * 0.055, y * 0.055);
      const detail = this.biomeNoise[i](x * 0.017 + 31, y * 0.017 - 17) * 0.35;
      const score = broad + detail;
      if (score > best) {
        best = score;
        selected = SPECIES_LIST[i];
      }
    }
    return selected;
  };

  public getChunkKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  public getChunkForCell(x: number, y: number): Chunk {
    const cx = Math.floor(x / GAME_CONFIG.chunkSize);
    const cy = Math.floor(y / GAME_CONFIG.chunkSize);
    const key = this.getChunkKey(cx, cy);
    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cy, this.speciesAt);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  public getCell(x: number, y: number): Cell {
    return this.getChunkForCell(x, y).cells.get(getCellKey(x, y))!;
  }

  public getExistingCell(x: number, y: number): Cell | undefined {
    const cx = Math.floor(x / GAME_CONFIG.chunkSize);
    const cy = Math.floor(y / GAME_CONFIG.chunkSize);
    return this.chunks.get(this.getChunkKey(cx, cy))?.cells.get(getCellKey(x, y));
  }

  public getLoadedChunks(): Chunk[] {
    return [...this.chunks.values()];
  }

  public initPlayerColony(playerSpecies: SpeciesId) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.getCell(dx, dy);
        cell.currentSpeciesId = playerSpecies;
        cell.naturalSpeciesId = playerSpecies;
        cell.claimed = true;
        cell.revealed = true;
        cell.reinforcement = dx === 0 && dy === 0 ? 3 : 1;
        cell.isCore = dx === 0 && dy === 0;
      }
    }
  }

  public getSpeciesPrediction(x: number, y: number): SpeciesPrediction {
    const target = this.getCell(x, y);
    const weights: Record<SpeciesId, number> = { cyan: 8, coral: 8, yellow: 8, magenta: 8, violet: 8 };
    weights[target.naturalSpeciesId] += 52;

    for (let dx = -2; dx <= 2; dx++) {
      for (let dy = -2; dy <= 2; dy++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = this.getCell(x + dx, y + dy);
        const proximity = Math.max(1, 4 - Math.max(Math.abs(dx), Math.abs(dy)));
        weights[neighbor.naturalSpeciesId] += proximity * 3;
      }
    }

    const total = SPECIES_LIST.reduce((sum, id) => sum + weights[id], 0);
    const probabilities = { cyan: 0, coral: 0, yellow: 0, magenta: 0, violet: 0 } satisfies Record<SpeciesId, number>;
    let likelySpecies = target.naturalSpeciesId;
    let confidencePercent = 0;
    for (const id of SPECIES_LIST) {
      probabilities[id] = Math.round((weights[id] / total) * 100);
      if (probabilities[id] > confidencePercent) {
        confidencePercent = probabilities[id];
        likelySpecies = id;
      }
    }
    const drift = 100 - SPECIES_LIST.reduce((sum, id) => sum + probabilities[id], 0);
    probabilities[likelySpecies] += drift;
    return { likelySpecies, confidencePercent: probabilities[likelySpecies], probabilities };
  }
}
