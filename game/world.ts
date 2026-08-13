import { GAME_CONFIG, SpeciesId } from './config';
import { PRNG } from './rng';
import { Cell, SpeciesPrediction } from './types';

export const SPECIES_LIST: SpeciesId[] = ['cyan', 'coral', 'yellow', 'magenta', 'violet'];

export function getCellKey(x: number, y: number): string {
  return `${x}:${y}`;
}

export function parseCellKey(key: string): [number, number] {
  const parts = key.split(':').map(Number);
  return [parts[0], parts[1]];
}

export class Chunk {
  public cx: number;
  public cy: number;
  public cells: Map<string, Cell> = new Map();

  constructor(cx: number, cy: number, seed: number) {
    this.cx = cx;
    this.cy = cy;
    this.generate(seed);
  }

  private generate(seed: number) {
    const startX = this.cx * GAME_CONFIG.chunkSize;
    const startY = this.cy * GAME_CONFIG.chunkSize;

    for (let x = 0; x < GAME_CONFIG.chunkSize; x++) {
      for (let y = 0; y < GAME_CONFIG.chunkSize; y++) {
        const worldX = startX + x;
        const worldY = startY + y;
        const key = getCellKey(worldX, worldY);

        // Deterministic species pick using PRNG seed + coordinates
        const prng = new PRNG(seed + worldX * 73856093 ^ worldY * 19349663);
        const naturalSpeciesId = prng.pick(SPECIES_LIST);

        this.cells.set(key, {
          x: worldX,
          y: worldY,
          naturalSpeciesId,
          currentSpeciesId: naturalSpeciesId,
          revealed: false,
          reinforcement: 1,
        });
      }
    }
  }
}

export class WorldManager {
  public seed: number;
  private chunks: Map<string, Chunk> = new Map();

  constructor(seed: number) {
    this.seed = seed;
  }

  public getChunkKey(cx: number, cy: number): string {
    return `${cx}:${cy}`;
  }

  public getChunkForCell(x: number, y: number): Chunk {
    const cx = Math.floor(x / GAME_CONFIG.chunkSize);
    const cy = Math.floor(y / GAME_CONFIG.chunkSize);
    const key = this.getChunkKey(cx, cy);

    let chunk = this.chunks.get(key);
    if (!chunk) {
      chunk = new Chunk(cx, cy, this.seed);
      this.chunks.set(key, chunk);
    }
    return chunk;
  }

  public getCell(x: number, y: number): Cell {
    const chunk = this.getChunkForCell(x, y);
    return chunk.cells.get(getCellKey(x, y))!;
  }

  public getExistingCell(x: number, y: number): Cell | undefined {
    const cx = Math.floor(x / GAME_CONFIG.chunkSize);
    const cy = Math.floor(y / GAME_CONFIG.chunkSize);
    const chunkKey = this.getChunkKey(cx, cy);
    const chunk = this.chunks.get(chunkKey);
    if (!chunk) return undefined;
    return chunk.cells.get(getCellKey(x, y));
  }

  public getLoadedChunks(): Chunk[] {
    return Array.from(this.chunks.values());
  }

  /**
   * Initializes small 3x3 player colony centered around Core (0,0).
   */
  public initPlayerColony(playerSpecies: SpeciesId) {
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        const cell = this.getCell(dx, dy);
        cell.currentSpeciesId = playerSpecies;
        cell.naturalSpeciesId = playerSpecies;
        cell.revealed = true;
        cell.reinforcement = (dx === 0 && dy === 0) ? 3 : 1;
        if (dx === 0 && dy === 0) {
          cell.isCore = true;
        }
      }
    }
  }

  /**
   * Calculates deterministic biological pressure & species likelihood for hidden tile (x, y).
   */
  public getSpeciesPrediction(x: number, y: number): SpeciesPrediction {
    const targetCell = this.getCell(x, y);
    const weights: Record<SpeciesId, number> = {
      cyan: 10,
      coral: 10,
      yellow: 10,
      magenta: 10,
      violet: 10,
    };

    // Heavy weight from natural seeded species
    weights[targetCell.naturalSpeciesId] += 40;

    // Weight from revealed 8-neighbor cells
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nCell = this.getExistingCell(x + dx, y + dy);
        if (nCell && nCell.revealed) {
          weights[nCell.currentSpeciesId] += 25;
        }
      }
    }

    let totalWeight = 0;
    for (const sp of SPECIES_LIST) {
      totalWeight += weights[sp];
    }

    const probabilities: Record<SpeciesId, number> = {
      cyan: 0,
      coral: 0,
      yellow: 0,
      magenta: 0,
      violet: 0,
    };

    let maxProb = 0;
    let likelySpecies: SpeciesId = targetCell.naturalSpeciesId;

    for (const sp of SPECIES_LIST) {
      const pct = Math.round((weights[sp] / totalWeight) * 100);
      probabilities[sp] = pct;
      if (pct > maxProb) {
        maxProb = pct;
        likelySpecies = sp;
      }
    }

    return {
      likelySpecies,
      confidencePercent: maxProb,
      probabilities,
    };
  }
}
