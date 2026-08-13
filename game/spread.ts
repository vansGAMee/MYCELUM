import { SpeciesId } from './config';
import { PRNG } from './rng';
import { CellKey, EnemyIntent, GameAnimEvent, Strain } from './types';
import { getCellKey, WorldManager } from './world';

const DIRECTIONS: [number, number][] = [[1,0],[-1,0],[0,1],[0,-1]];

export class SpreadSimulator {
  /**
   * Generates readable telegraphed enemy intents.
   */
  public static generateIntents(
    world: WorldManager,
    prng: PRNG,
    strains: Strain[],
    maxIntents: number,
    playerSpecies: SpeciesId,
    coreX: number = 0,
    coreY: number = 0
  ): EnemyIntent[] {
    const intents: EnemyIntent[] = [];
    const loadedChunks = world.getLoadedChunks();

    const candidates: Array<{
      speciesId: SpeciesId;
      fromX: number;
      fromY: number;
      toX: number;
      toY: number;
      isThreatToCore: boolean;
      distToCore: number;
    }> = [];

    for (const chunk of loadedChunks) {
      for (const cell of chunk.cells.values()) {
        if (!cell.revealed) continue;
        const species = cell.currentSpeciesId;
        if (species === playerSpecies) continue; // Hostile species only

        for (const [dx, dy] of DIRECTIONS) {
          const nx = cell.x + dx;
          const ny = cell.y + dy;
          const target = world.getExistingCell(nx, ny);
          if (!target) continue;

          // Target must be player cell or unrevealed frontier
          if (!target.revealed || target.currentSpeciesId === playerSpecies) {
            const isThreatToCore = nx === coreX && ny === coreY;
            const distToCore = Math.abs(nx - coreX) + Math.abs(ny - coreY);

            candidates.push({
              speciesId: species,
              fromX: cell.x,
              fromY: cell.y,
              toX: nx,
              toY: ny,
              isThreatToCore,
              distToCore,
            });
          }
        }
      }
    }

    if (candidates.length === 0) return [];

    // Prioritize core threats first, then closest distance to core
    candidates.sort((a, b) => {
      if (a.isThreatToCore !== b.isThreatToCore) return a.isThreatToCore ? -1 : 1;
      return a.distToCore - b.distToCore;
    });

    const selectedKeys = new Set<string>();
    for (const c of candidates) {
      if (intents.length >= maxIntents) break;
      const targetKey = getCellKey(c.toX, c.toY);
      if (selectedKeys.has(targetKey)) continue;

      selectedKeys.add(targetKey);
      intents.push({
        id: `intent_${c.fromX}_${c.fromY}_to_${c.toX}_${c.toY}_${Date.now()}`,
        sourceX: c.fromX,
        sourceY: c.fromY,
        sourceSpecies: c.speciesId,
        toX: c.toX,
        toY: c.toY,
        isThreatToCore: c.isThreatToCore,
      });
    }

    return intents;
  }

  /**
   * CRITICAL INTENT VALIDATION (ZOMBIE INTENT FIX):
   * Verifies source cell exists and still belongs to sourceSpecies, and target cell is valid.
   */
  public static validateIntents(intents: EnemyIntent[], world: WorldManager, playerSpecies: SpeciesId): EnemyIntent[] {
    return intents.filter((intent) => {
      const sourceCell = world.getExistingCell(intent.sourceX, intent.sourceY);
      if (!sourceCell || !sourceCell.revealed || sourceCell.currentSpeciesId !== intent.sourceSpecies) {
        return false; // Source was captured, repainted, or destroyed -> DELETE INTENT IMMEDIATELY!
      }
      const targetCell = world.getExistingCell(intent.toX, intent.toY);
      if (targetCell && targetCell.currentSpeciesId === intent.sourceSpecies) {
        return false; // Target already belongs to attacker -> DELETE INTENT!
      }
      return true;
    });
  }

  /**
   * Resolves valid enemy intents sequentially.
   */
  public static resolveIntents(
    intents: EnemyIntent[],
    world: WorldManager,
    playerSpecies: SpeciesId,
    coreX: number,
    coreY: number
  ): { changedCells: CellKey[]; anims: GameAnimEvent[]; coreCaptured: boolean } {
    const changedCells: CellKey[] = [];
    const anims: GameAnimEvent[] = [];
    let coreCaptured = false;

    for (const intent of intents) {
      const sourceCell = world.getExistingCell(intent.sourceX, intent.sourceY);
      if (!sourceCell || sourceCell.currentSpeciesId !== intent.sourceSpecies) continue;

      const targetCell = world.getCell(intent.toX, intent.toY);

      // Check reinforcement defense rule: reinforced cell (level 2+) requires >= 2 adjacent attacker cells
      if (targetCell.reinforcement > 1 && targetCell.currentSpeciesId === playerSpecies) {
        let attackerSupport = 0;
        for (const [dx, dy] of DIRECTIONS) {
          const neighbor = world.getExistingCell(intent.toX + dx, intent.toY + dy);
          if (neighbor && neighbor.revealed && neighbor.currentSpeciesId === intent.sourceSpecies) {
            attackerSupport++;
          }
        }
        if (attackerSupport < 2) {
          // Defense held!
          continue;
        }
      }

      // Capture target cell
      targetCell.currentSpeciesId = intent.sourceSpecies;
      targetCell.revealed = true;
      targetCell.reinforcement = 1;

      const key = getCellKey(intent.toX, intent.toY);
      changedCells.push(key);
      anims.push({
        type: 'spread',
        fromX: intent.sourceX,
        fromY: intent.sourceY,
        toX: intent.toX,
        toY: intent.toY,
        species: intent.sourceSpecies,
      });

      // Check single Core capture loss condition
      if (intent.toX === coreX && intent.toY === coreY) {
        coreCaptured = true;
      }
    }

    return { changedCells, anims, coreCaptured };
  }
}
