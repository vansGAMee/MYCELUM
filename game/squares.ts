import { GAME_CONFIG, type SpeciesId } from './config';
import type { CellKey, SquareMatch, Strain } from './types';
import { getCellKey, parseCellKey, type WorldManager } from './world';

export function isSameFamily(a: SpeciesId, b: SpeciesId, _strains: Strain[]): boolean {
  return a === b;
}

export class SquareDetector {
  public static detectSquares(dirtyCells: CellKey[], world: WorldManager, strains: Strain[]): SquareMatch[] {
    const matches = new Map<string, SquareMatch>();
    const dirty = [...new Set(dirtyCells)].sort();

    for (const key of dirty) {
      const [cx, cy] = parseCellKey(key);
      const anchor = world.getCell(cx, cy);
      if (!anchor.claimed) continue;

      for (let size = GAME_CONFIG.minSquareSize; size <= GAME_CONFIG.maxSquareSize; size++) {
        for (let offsetX = 0; offsetX < size; offsetX++) {
          for (let offsetY = 0; offsetY < size; offsetY++) {
            if (offsetX !== 0 && offsetX !== size - 1 && offsetY !== 0 && offsetY !== size - 1) continue;
            const minX = cx - offsetX;
            const minY = cy - offsetY;
            const id = `${anchor.currentSpeciesId}:${minX}:${minY}:${size}`;
            if (matches.has(id)) continue;
            const match = this.check(minX, minY, size, anchor.currentSpeciesId, world, strains);
            if (match) matches.set(id, match);
          }
        }
      }
    }

    return [...matches.values()].sort((a, b) => a.size - b.size || a.minX - b.minX || a.minY - b.minY);
  }

  private static check(minX: number, minY: number, size: number, speciesId: SpeciesId, world: WorldManager, strains: Strain[]): SquareMatch | null {
    const maxX = minX + size - 1;
    const maxY = minY + size - 1;
    const perimeterCells: CellKey[] = [];
    const interiorCells: CellKey[] = [];
    let needsFill = false;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const cell = world.getCell(x, y);
        const key = getCellKey(x, y);
        const perimeter = x === minX || x === maxX || y === minY || y === maxY;
        if (perimeter) {
          if (!cell.claimed || !isSameFamily(cell.currentSpeciesId, speciesId, strains)) return null;
          perimeterCells.push(key);
        } else {
          interiorCells.push(key);
          if (!cell.claimed || !isSameFamily(cell.currentSpeciesId, speciesId, strains) || cell.reinforcement < 2) needsFill = true;
        }
      }
    }
    return needsFill ? { size, minX, minY, maxX, maxY, speciesId, perimeterCells, interiorCells } : null;
  }
}
