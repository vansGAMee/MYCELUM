import { GAME_CONFIG, type SpeciesId } from './config';
import type { PRNG } from './rng';
import type { SecondaryTrait, Strain, WorldEvent, WorldEventType } from './types';
import { getCellKey, SPECIES_LIST, type WorldManager } from './world';

export const EVENT_COPY: Record<WorldEventType, [string, string, number]> = {
  DENSE_FOG: ['Плотный туман', 'Известные клетки вне Ядра скрыты на три хода. Владение не меняется.', 3],
  COSMIC_SNAP: ['Космический разрыв', 'Сбой памяти скрывает известные клетки вне Ядра. Повторный осмотр бесплатен.', 1],
  SPORE_RAIN: ['Споровый дождь', 'На исследованном фронтире возникают спящие враждебные споры.', 2],
  BLOOM_TIDE: ['Прилив цветения', 'Одно семейство получает дополнительное давление наружу на три хода.', 3],
  DROUGHT: ['Засуха', 'Расширение замедляется на три хода, но соседние атаки продолжаются.', 3],
  MUTATION_SURGE: ['Всплеск мутаций', 'Видимый штамм на границе приобретает мутацию.', 3],
  DEAD_PATCH: ['Мёртвый участок', 'Небольшую область Субстрата нельзя захватить четыре хода.', 4],
  RESONANCE: ['Резонанс', 'Цепочки ускоряются; следующий крупный квадрат даёт дополнительную Перекраску.', 3],
};

export class WorldEventManager {
  public static triggerEvent(turn: number, prng: PRNG, world: WorldManager, strains: Strain[], playerSpecies: SpeciesId, forcedType?: WorldEventType, excludedTargetSpecies: SpeciesId[] = []): { event: WorldEvent; affectedCells: string[] } {
    const types = Object.keys(EVENT_COPY) as WorldEventType[];
    const type = forcedType ?? prng.pick(types);
    const [title, description, duration] = EVENT_COPY[type];
    const affectedCells: string[] = [];

    // Rendering order must never change seeded event outcomes.
    const claimed = world.getLoadedChunks()
      .flatMap((chunk) => [...chunk.cells.values()])
      .filter((cell) => cell.claimed && !cell.isCore)
      .sort((a, b) => a.x - b.x || a.y - b.y);
    const activeHostiles = [...new Set(claimed.map((cell) => cell.currentSpeciesId).filter((id) => id !== playerSpecies && !excludedTargetSpecies.includes(id)))];
    const targetSpeciesId = prng.pick(activeHostiles.length ? activeHostiles : SPECIES_LIST.filter((id) => id !== playerSpecies && !excludedTargetSpecies.includes(id)));
    if (type === 'DENSE_FOG' || type === 'COSMIC_SNAP') {
      const ratio = type === 'COSMIC_SNAP' ? 0.5 : 0.28;
      for (const cell of claimed) {
        if (prng.next() < ratio) {
          cell.isSnapHidden = true;
          cell.obscuredUntilTurn = type === 'DENSE_FOG' ? turn + duration - 1 : undefined;
          affectedCells.push(getCellKey(cell.x, cell.y));
        }
      }
    }

    if (type === 'SPORE_RAIN') {
      const frontier = claimed.flatMap((cell) => [[1, 0], [-1, 0], [0, 1], [0, -1]].map(([dx, dy]) => world.getCell(cell.x + dx, cell.y + dy)))
        .filter((cell, index, all) => !cell.claimed && !cell.isCore && all.indexOf(cell) === index)
        .sort((a, b) => a.x - b.x || a.y - b.y);
      const count = Math.min(frontier.length, prng.rangeInt(2, 4));
      for (let i = 0; i < count; i++) {
        const cell = frontier.splice(prng.rangeInt(0, frontier.length - 1), 1)[0];
        cell.currentSpeciesId = targetSpeciesId;
        cell.claimed = true;
        cell.revealed = true;
        cell.dormantUntilTurn = turn + 1;
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
            cell.blockedUntilTurn = turn + duration - 1;
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
      const frontier = claimed.filter((cell) => cell.currentSpeciesId === targetSpeciesId && [[1, 0], [-1, 0], [0, 1], [0, -1]].some(([dx, dy]) => !world.getCell(cell.x + dx, cell.y + dy).claimed));
      const target = frontier.length ? prng.pick(frontier) : undefined;
      if (target) {
        strains.push({ id, speciesId: targetSpeciesId, name: `${GAME_CONFIG.colors.species[targetSpeciesId].name} · ${trait}`, trait, colorHex: GAME_CONFIG.colors.species[targetSpeciesId].secondaryHex, cssHex: GAME_CONFIG.colors.species[targetSpeciesId].cssHex });
        target.strainId = id;
        affectedCells.push(getCellKey(target.x, target.y));
      }
    }

    const event: WorldEvent = { id: `event:${turn}:${type}`, type, title, description, targetSpeciesId, turn, duration, expiresTurn: turn + duration - 1 };
    return { event, affectedCells };
  }
}
