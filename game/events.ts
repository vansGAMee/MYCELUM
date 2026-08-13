import { GAME_CONFIG, type SpeciesId } from './config';
import type { PRNG } from './rng';
import type { SecondaryTrait, Strain, WorldEvent, WorldEventType } from './types';
import { getCellKey, SPECIES_LIST, type WorldManager } from './world';

export const EVENT_COPY: Record<WorldEventType, [string, string, number]> = {
  DENSE_FOG: ['Dense Fog', 'Known non-Core cells are obscured for three turns. Ownership is unchanged.', 3],
  COSMIC_SNAP: ['Cosmic Snap', 'A memory collapse hides known non-Core information. Re-inspection is free.', 1],
  SPORE_RAIN: ['Spore Rain', 'Dormant hostile spores appear along the explored frontier.', 2],
  BLOOM_TIDE: ['Bloom Tide', 'One family gains additional outward pressure for three turns.', 3],
  DROUGHT: ['Drought', 'Outward expansion slows for three turns; adjacent combat remains active.', 3],
  MUTATION_SURGE: ['Mutation Surge', 'A visible frontier strain mutates.', 3],
  DEAD_PATCH: ['Dead Patch', 'A small substrate region cannot be captured for four turns.', 4],
  RESONANCE: ['Resonance', 'Square chains quicken; the next large square earns an extra Repaint.', 3],
};

export class WorldEventManager {
  public static triggerEvent(turn: number, prng: PRNG, world: WorldManager, strains: Strain[], playerSpecies: SpeciesId, forcedType?: WorldEventType): { event: WorldEvent; affectedCells: string[] } {
    const types = Object.keys(EVENT_COPY) as WorldEventType[];
    const type = forcedType ?? prng.pick(types);
    const targetSpeciesId = prng.pick(SPECIES_LIST.filter((id) => id !== playerSpecies));
    const [title, description, duration] = EVENT_COPY[type];
    const affectedCells: string[] = [];

    const claimed = world.getLoadedChunks().flatMap((chunk) => [...chunk.cells.values()]).filter((cell) => cell.claimed && !cell.isCore);
    if (type === 'DENSE_FOG' || type === 'COSMIC_SNAP') {
      const ratio = type === 'COSMIC_SNAP' ? 0.5 : 0.28;
      for (const cell of claimed) {
        if (prng.next() < ratio) {
          cell.isSnapHidden = true;
          cell.obscuredUntilTurn = type === 'DENSE_FOG' ? turn + duration : undefined;
          affectedCells.push(getCellKey(cell.x, cell.y));
        }
      }
    }

    if (type === 'SPORE_RAIN') {
      const frontier = claimed.flatMap((cell) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => world.getCell(cell.x + dx, cell.y + dy)))
        .filter((cell, index, all) => !cell.claimed && !cell.isCore && all.indexOf(cell) === index);
      const count = Math.min(frontier.length, prng.rangeInt(2, 4));
      for (let i = 0; i < count; i++) {
        const cell = frontier.splice(prng.rangeInt(0, frontier.length - 1), 1)[0];
        cell.currentSpeciesId = targetSpeciesId;
        cell.claimed = true;
        cell.revealed = true;
        cell.lastChangedTurn = turn;
        affectedCells.push(getCellKey(cell.x, cell.y));
      }
    }

    if (type === 'DEAD_PATCH') {
      const anchor = claimed.length ? prng.pick(claimed) : world.getCell(5, 5);
      for (let dx = 1; dx <= 2; dx++) {
        for (let dy = 1; dy <= 2; dy++) {
          const cell = world.getCell(anchor.x + dx, anchor.y + dy);
          if (!cell.isCore && !cell.claimed) {
            cell.blockedUntilTurn = turn + duration;
            cell.revealed = true;
            affectedCells.push(getCellKey(cell.x, cell.y));
          }
        }
      }
    }

    if (type === 'MUTATION_SURGE') {
      const traits: SecondaryTrait[] = ['swift', 'armored', 'parasite'];
      const trait = prng.pick(traits);
      const id = `${targetSpeciesId}:${trait}:${turn}`;
      strains.push({ id, speciesId: targetSpeciesId, name: `${GAME_CONFIG.colors.species[targetSpeciesId].name} · ${trait}`, trait, colorHex: GAME_CONFIG.colors.species[targetSpeciesId].secondaryHex, cssHex: GAME_CONFIG.colors.species[targetSpeciesId].cssHex });
      const target = claimed.find((cell) => cell.currentSpeciesId === targetSpeciesId);
      if (target) target.strainId = id;
    }

    const event: WorldEvent = { id: `event:${turn}:${type}`, type, title, description, targetSpeciesId, turn, duration, expiresTurn: turn + duration };
    return { event, affectedCells };
  }
}
