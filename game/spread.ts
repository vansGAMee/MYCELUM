import { GAME_CONFIG, type SpeciesId } from './config';
import type { PRNG } from './rng';
import type { CellKey, EnemyIntent, GameAnimEvent } from './types';
import { getCellKey, parseCellKey, type WorldManager } from './world';

const DIRS8: Array<[number, number]> = [
  [-1, -1], [0, -1], [1, -1],
  [-1, 0], [1, 0],
  [-1, 1], [0, 1], [1, 1],
];

function enemyAttackChance(world: WorldManager, species: SpeciesId, x: number, y: number): number {
  const target = world.getCell(x, y);
  let support = 0;
  let defense = 0;
  for (const [dx, dy] of DIRS8) {
    const cell = world.getExistingCell(x + dx, y + dy);
    if (!cell?.claimed) continue;
    if (cell.currentSpeciesId === species) support++;
    if (cell.currentSpeciesId === target.currentSpeciesId) defense++;
  }
  const reinforcement = target.reinforcement > 1 ? 0.15 : 0;
  const chance = GAME_CONFIG.attackBaseChance
    + Math.max(0, support - 1) * GAME_CONFIG.attackAllySupportBonus
    - Math.max(0, defense - 1) * GAME_CONFIG.attackDefenderSupportPenalty
    - reinforcement;
  return Math.round(Math.max(0.1, Math.min(0.9, chance)) * 100);
}

export class SpreadSimulator {
  public static generateIntents(
    world: WorldManager,
    prng: PRNG,
    maxIntents: number,
    playerSpecies: SpeciesId,
    turn: number,
    coreX = 0,
    coreY = 0,
  ): EnemyIntent[] {
    const candidates: Array<EnemyIntent & { priority: number }> = [];
    for (const chunk of world.getLoadedChunks()) {
      for (const source of chunk.cells.values()) {
        if (!source.claimed || !source.revealed || source.currentSpeciesId === playerSpecies) continue;
        for (const [dx, dy] of DIRS8) {
          const tx = source.x + dx;
          const ty = source.y + dy;
          const target = world.getCell(tx, ty);
          if (target.blockedUntilTurn && target.blockedUntilTurn >= turn) continue;
          if (target.claimed && target.currentSpeciesId === source.currentSpeciesId) continue;
          if (target.claimed && target.currentSpeciesId !== playerSpecies) continue;
          const attack = target.claimed && target.currentSpeciesId === playerSpecies;
          const distance = Math.abs(tx - coreX) + Math.abs(ty - coreY);
          const coreThreat = tx === coreX && ty === coreY;
          candidates.push({
            id: `intent:${turn}:${source.x}:${source.y}:${tx}:${ty}`,
            sourceCell: getCellKey(source.x, source.y),
            sourceSpeciesId: source.currentSpeciesId,
            targetCell: getCellKey(tx, ty),
            actionType: attack ? 'attack' : 'expand',
            chance: attack ? enemyAttackChance(world, source.currentSpeciesId, tx, ty) : 100,
            createdTurn: turn,
            priority: (coreThreat ? -1000 : 0) + distance + prng.next() * 2,
          });
        }
      }
    }

    candidates.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    const targets = new Set<CellKey>();
    const result: EnemyIntent[] = [];
    for (const { priority: _priority, ...intent } of candidates) {
      if (result.length >= maxIntents) break;
      if (targets.has(intent.targetCell)) continue;
      targets.add(intent.targetCell);
      result.push(intent);
    }
    return result;
  }

  public static validateIntents(intents: EnemyIntent[], world: WorldManager, playerSpecies: SpeciesId, turn = Infinity): EnemyIntent[] {
    return intents.filter((intent) => {
      const [sx, sy] = parseCellKey(intent.sourceCell);
      const [tx, ty] = parseCellKey(intent.targetCell);
      const source = world.getExistingCell(sx, sy);
      const target = world.getExistingCell(tx, ty);
      if (!source?.claimed || !source.revealed || source.currentSpeciesId !== intent.sourceSpeciesId) return false;
      if (!target) return false;
      if (target.blockedUntilTurn && target.blockedUntilTurn >= turn) return false;
      if (target.claimed && target.currentSpeciesId === intent.sourceSpeciesId) return false;
      if (intent.actionType === 'attack' && (!target.claimed || target.currentSpeciesId !== playerSpecies)) return false;
      if (intent.actionType === 'expand' && target.claimed) return false;
      return Math.max(Math.abs(tx - sx), Math.abs(ty - sy)) === 1;
    });
  }

  public static resolveIntents(
    intents: EnemyIntent[],
    world: WorldManager,
    prng: PRNG,
    playerSpecies: SpeciesId,
    coreX: number,
    coreY: number,
    turn: number,
  ): { changedCells: CellKey[]; anims: GameAnimEvent[]; coreCaptured: boolean } {
    const changedCells: CellKey[] = [];
    const anims: GameAnimEvent[] = [];
    let coreCaptured = false;
    let remaining = this.validateIntents(intents, world, playerSpecies, turn);

    while (remaining.length) {
      const intent = remaining.shift()!;
      const [sx, sy] = parseCellKey(intent.sourceCell);
      const [tx, ty] = parseCellKey(intent.targetCell);
      if (prng.next() * 100 >= intent.chance) continue;
      const target = world.getCell(tx, ty);
      target.currentSpeciesId = intent.sourceSpeciesId;
      target.claimed = true;
      target.revealed = true;
      target.isSnapHidden = false;
      target.reinforcement = 1;
      target.lastChangedTurn = turn;
      changedCells.push(intent.targetCell);
      anims.push({ type: 'spread', fromX: sx, fromY: sy, toX: tx, toY: ty, species: intent.sourceSpeciesId });
      if (tx === coreX && ty === coreY) coreCaptured = true;
      remaining = this.validateIntents(remaining, world, playerSpecies, turn);
    }
    return { changedCells, anims, coreCaptured };
  }
}
