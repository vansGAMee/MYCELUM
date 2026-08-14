import { GAME_CONFIG, type SpeciesId } from './config';
import type { PRNG } from './rng';
import type { CellKey, EnemyIntent, GameAnimEvent, Strain } from './types';
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
  const reinforcement = target.reinforcement > 2 ? 0.25 : target.reinforcement > 1 ? 0.15 : 0;
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
    strains: Strain[],
    maxIntents: number,
    playerSpecies: SpeciesId,
    turn: number,
    coreX = 0,
    coreY = 0,
    modifiers?: { bonusSpecies?: SpeciesId; drought?: boolean; excludedSourceSpecies?: SpeciesId[]; attackableSpecies?: SpeciesId[] },
  ): EnemyIntent[] {
    const candidates: Array<EnemyIntent & { priority: number }> = [];
    const excludedSources = modifiers?.excludedSourceSpecies ?? [playerSpecies];
    const attackableSpecies = modifiers?.attackableSpecies ?? [playerSpecies];
    const sources = world.getLoadedChunks()
      .flatMap((chunk) => [...chunk.cells.values()])
      .filter((cell) => cell.claimed && cell.revealed && !excludedSources.includes(cell.currentSpeciesId))
      .sort((a, b) => a.x - b.x || a.y - b.y);
    for (const source of sources) {
        if (!source.claimed || !source.revealed || excludedSources.includes(source.currentSpeciesId) || (source.dormantUntilTurn && source.dormantUntilTurn >= turn)) continue;
        const strain = source.strainId ? strains.find((item) => item.id === source.strainId) : undefined;
        const traits = strain?.traits ?? (strain ? [strain.trait] : []);
        const behaviorSpecies = strain?.parentSpeciesIds ?? [source.currentSpeciesId];
        const directions = traits.includes('parasite') ? DIRS8 : DIRS8.filter(([dx, dy]) => dx === 0 || dy === 0);
        for (const [dx, dy] of directions) {
          const tx = source.x + dx;
          const ty = source.y + dy;
          const target = world.getCell(tx, ty);
          if (target.blockedUntilTurn && target.blockedUntilTurn >= turn) continue;
          if (target.claimed && target.currentSpeciesId === source.currentSpeciesId) continue;
          if (target.claimed && !attackableSpecies.includes(target.currentSpeciesId)) continue;
          const attack = target.claimed && attackableSpecies.includes(target.currentSpeciesId);
          const distance = Math.abs(tx - coreX) + Math.abs(ty - coreY);
          const coreThreat = tx === coreX && ty === coreY;
          let personality = 0;
          const nearbyFamily = DIRS8.filter(([nx, ny]) => {
            const neighbor = world.getExistingCell(source.x + nx, source.y + ny);
            return neighbor?.claimed && neighbor.currentSpeciesId === source.currentSpeciesId;
          }).length;
          for (const species of behaviorSpecies) {
            const blend = behaviorSpecies.length > 1 ? 0.65 : 1;
            if (species === 'coral') personality += (attack ? -14 : 4) * blend;
            if (species === 'yellow') personality += (attack ? 4 : -8) * blend;
            if (species === 'cyan') personality -= nearbyFamily * 1.5 * blend;
            if (species === 'magenta') personality += (attack ? -8 : -nearbyFamily) * blend;
            if (species === 'violet') personality += (attack ? 3 : -nearbyFamily * 2) * blend;
          }
          if (traits.includes('swift')) personality -= 6;
          candidates.push({
            id: `intent:${turn}:${source.x}:${source.y}:${tx}:${ty}`,
            sourceCell: getCellKey(source.x, source.y),
            sourceSpeciesId: source.currentSpeciesId,
            targetCell: getCellKey(tx, ty),
            actionType: attack ? 'attack' : 'expand',
            chance: attack ? enemyAttackChance(world, source.currentSpeciesId, tx, ty) : 100,
            createdTurn: turn,
            priority: (coreThreat ? -1000 : 0) + distance + personality + prng.next() * 2,
          });
        }
    }

    candidates.sort((a, b) => a.priority - b.priority || a.id.localeCompare(b.id));
    const targets = new Set<CellKey>();
    const result: EnemyIntent[] = [];
    const expansionLimit = Math.max(0, maxIntents - (modifiers?.drought ? 1 : 0));
    let expansions = 0;
    for (const { priority: _priority, ...intent } of candidates) {
      if (result.length >= maxIntents) break;
      if (targets.has(intent.targetCell)) continue;
      if (intent.actionType === 'expand' && expansions >= expansionLimit) continue;
      targets.add(intent.targetCell);
      result.push(intent);
      if (intent.actionType === 'expand') expansions++;
    }
    if (modifiers?.bonusSpecies) {
      const bonus = candidates.find((candidate) => candidate.sourceSpeciesId === modifiers.bonusSpecies && !targets.has(candidate.targetCell));
      if (bonus) {
        const { priority: _priority, ...intent } = bonus;
        result.push(intent);
      }
    }
    return result;
  }

  public static validateIntents(intents: EnemyIntent[], world: WorldManager, playerSpecies: SpeciesId, turn = Infinity, attackableSpecies: SpeciesId[] = [playerSpecies]): EnemyIntent[] {
    return intents.filter((intent) => {
      const [sx, sy] = parseCellKey(intent.sourceCell);
      const [tx, ty] = parseCellKey(intent.targetCell);
      const source = world.getExistingCell(sx, sy);
      const target = world.getExistingCell(tx, ty);
      if (!source?.claimed || !source.revealed || source.currentSpeciesId !== intent.sourceSpeciesId) return false;
      if (source.dormantUntilTurn && source.dormantUntilTurn >= turn) return false;
      if (!target) return false;
      if (target.blockedUntilTurn && target.blockedUntilTurn >= turn) return false;
      if (target.claimed && target.currentSpeciesId === intent.sourceSpeciesId) return false;
      if (intent.actionType === 'attack' && (!target.claimed || !attackableSpecies.includes(target.currentSpeciesId))) return false;
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
    onChanged?: (key: CellKey) => boolean,
    attackableSpecies: SpeciesId[] = [playerSpecies],
  ): { changedCells: CellKey[]; anims: GameAnimEvent[]; coreCaptured: boolean } {
    const changedCells: CellKey[] = [];
    const anims: GameAnimEvent[] = [];
    let coreCaptured = false;
    let remaining = this.validateIntents(intents, world, playerSpecies, turn, attackableSpecies);

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
      if (coreCaptured || onChanged?.(intent.targetCell)) break;
      remaining = this.validateIntents(remaining, world, playerSpecies, turn, attackableSpecies);
    }
    return { changedCells, anims, coreCaptured };
  }
}
