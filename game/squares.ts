import { GAME_CONFIG, SpeciesId } from './config';
import { CellKey, SquareMatch, Strain } from './types';
import { getCellKey, WorldManager } from './world';

/**
 * Checks whether two species or strains belong to the same species family.
 */
export function isSameFamily(speciesA: SpeciesId, speciesB: SpeciesId, strains: Strain[]): boolean {
  if (speciesA === speciesB) return true;
  const strainA = strains.find((s) => s.id === speciesA);
  const strainB = strains.find((s) => s.id === speciesB);

  const parentA = strainA ? strainA.speciesId : speciesA;
  const parentB = strainB ? strainB.speciesId : speciesB;

  return parentA === parentB;
}

export class SquareDetector {
  /**
   * Detects completed squares or rectangles (3x3 up to 12x12) whose perimeter cells are of the same species.
   */
  public static detectSquares(
    dirtyCells: CellKey[],
    world: WorldManager,
    strains: Strain[]
  ): SquareMatch[] {
    const matches: SquareMatch[] = [];
    const processedPerimeters = new Set<string>();

    for (const key of dirtyCells) {
      const [cx, cy] = key.split(':').map(Number);
      const targetCell = world.getCell(cx, cy);
      if (!targetCell || !targetCell.revealed) continue;

      const targetSpecies = targetCell.currentSpeciesId;

      // Test width and height from minSquareSize up to maxSquareSize
      for (let width = GAME_CONFIG.minSquareSize; width <= GAME_CONFIG.maxSquareSize; width++) {
        for (let height = GAME_CONFIG.minSquareSize; height <= GAME_CONFIG.maxSquareSize; height++) {
          for (let offsetX = 0; offsetX < width; offsetX++) {
            for (let offsetY = 0; offsetY < height; offsetY++) {
              const isOnPerimeter =
                offsetX === 0 || offsetX === width - 1 || offsetY === 0 || offsetY === height - 1;
              if (!isOnPerimeter) continue;

              const minX = cx - offsetX;
              const minY = cy - offsetY;
              const maxX = minX + width - 1;
              const maxY = minY + height - 1;

              const matchKey = `${minX}:${minY}:${width}:${height}:${targetSpecies}`;
              if (processedPerimeters.has(matchKey)) continue;
              processedPerimeters.add(matchKey);

              const match = SquareDetector.checkPerimeter(minX, minY, maxX, maxY, width, height, targetSpecies, world, strains);
              if (match) {
                matches.push(match);
              }
            }
          }
        }
      }
    }

    matches.sort((a, b) => b.size - a.size);
    return matches;
  }

  private static checkPerimeter(
    minX: number,
    minY: number,
    maxX: number,
    maxY: number,
    width: number,
    height: number,
    targetSpecies: SpeciesId,
    world: WorldManager,
    strains: Strain[]
  ): SquareMatch | null {
    const perimeterCells: CellKey[] = [];
    const interiorCells: CellKey[] = [];
    let isValidPerimeter = true;

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        const isPerimeter = x === minX || x === maxX || y === minY || y === maxY;
        const cellKey = getCellKey(x, y);

        if (isPerimeter) {
          const cell = world.getCell(x, y);
          if (!cell.revealed || !isSameFamily(cell.currentSpeciesId, targetSpecies, strains)) {
            isValidPerimeter = false;
            break;
          }
          perimeterCells.push(cellKey);
        } else {
          interiorCells.push(cellKey);
        }
      }
      if (!isValidPerimeter) break;
    }

    if (!isValidPerimeter) return null;

    // Check if at least one interior cell is unrevealed or owned by another species
    let needsFill = false;
    for (const key of interiorCells) {
      const [ix, iy] = key.split(':').map(Number);
      const cell = world.getCell(ix, iy);
      if (!cell.revealed || !isSameFamily(cell.currentSpeciesId, targetSpecies, strains)) {
        needsFill = true;
        break;
      }
    }

    if (!needsFill) return null;

    return {
      size: Math.max(width, height),
      minX,
      minY,
      maxX,
      maxY,
      speciesId: targetSpecies,
      perimeterCells,
      interiorCells,
    };
  }
}
