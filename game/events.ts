import { GAME_CONFIG, SpeciesId } from './config';
import { PRNG } from './rng';
import { SecondaryTrait, Strain, WorldEvent, WorldEventType } from './types';
import { getCellKey, SPECIES_LIST, WorldManager } from './world';

export class WorldEventManager {
  /**
   * Generates a telegraphed World Event announcement.
   */
  public static triggerEvent(
    turn: number,
    prng: PRNG,
    world: WorldManager,
    strains: Strain[],
    playerSpecies: SpeciesId
  ): { event: WorldEvent; affectedCells: string[] } {
    const eventTypes: WorldEventType[] = [
      'DENSE_FOG',
      'COSMIC_SNAP',
      'SPORE_RAIN',
      'BLOOM_TIDE',
      'DROUGHT',
      'MUTATION_SURGE',
      'DEAD_PATCH',
      'RESONANCE',
    ];

    const type = prng.pick(eventTypes);
    const targetSpecies = prng.pick(SPECIES_LIST);
    const affectedCells: string[] = [];

    let title = '';
    let description = '';

    switch (type) {
      case 'DENSE_FOG': {
        title = 'ПЛОТНЫЙ ТУМАН (DENSE FOG)';
        description = 'Густой туман скрывает часть территории на 3 хода. Ваше владение клетками сохраняется!';
        const loaded = world.getLoadedChunks();
        for (const chunk of loaded) {
          for (const cell of chunk.cells.values()) {
            if (cell.revealed && !cell.isCore && prng.next() < 0.25) {
              cell.isSnapHidden = true;
              affectedCells.push(getCellKey(cell.x, cell.y));
            }
          }
        }
        break;
      }

      case 'COSMIC_SNAP': {
        title = 'КОСМИЧЕСКИЙ ЩЕЛЧОК (COSMIC SNAP)';
        description = 'Электромагнитная волна скрывает 50% информации. Повторный осмотр этих клеток БЕСПЛАТЕН!';
        const loaded = world.getLoadedChunks();
        for (const chunk of loaded) {
          for (const cell of chunk.cells.values()) {
            if (cell.revealed && !cell.isCore && prng.next() < 0.50) {
              cell.revealed = false;
              affectedCells.push(getCellKey(cell.x, cell.y));
            }
          }
        }
        break;
      }

      case 'SPORE_RAIN': {
        const speciesObj = GAME_CONFIG.colors.species[targetSpecies];
        title = 'СПОРОВЫЙ ДОЖДЬ (SPORE RAIN)';
        description = `Споры породы ${speciesObj.name} выпадают на границе исследованой зоны!`;

        const centerX = prng.rangeInt(-12, 12);
        const centerY = prng.rangeInt(-12, 12);
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const cell = world.getCell(centerX + dx, centerY + dy);
            if (!cell.isCore) {
              cell.currentSpeciesId = targetSpecies;
              cell.revealed = true;
              affectedCells.push(getCellKey(cell.x, cell.y));
            }
          }
        }
        break;
      }

      case 'BLOOM_TIDE': {
        const speciesObj = GAME_CONFIG.colors.species[targetSpecies];
        title = 'ВСПЫШКА РОСТА (BLOOM TIDE)';
        description = `Порода ${speciesObj.name} получает +1 намеренное распространение на 3 хода!`;
        break;
      }

      case 'DROUGHT': {
        title = 'ЗАСТОЙ МИЦЕЛИЯ (DROUGHT)';
        description = 'Засуха замедляет разрастание всех вражеских штаммов на 3 хода.';
        break;
      }

      case 'MUTATION_SURGE': {
        const traitTypes: SecondaryTrait[] = ['fast', 'armored', 'parasite'];
        const trait = prng.pick(traitTypes);
        const speciesObj = GAME_CONFIG.colors.species[targetSpecies];

        const traitNames: Record<SecondaryTrait, string> = {
          fast: 'БЫСТРЫЙ',
          armored: 'БРОНИРОВАННЫЙ',
          parasite: 'ПАРАЗИТ',
        };

        const strainId = `${targetSpecies}_${trait}_${turn}`;
        const newStrain: Strain = {
          id: strainId,
          speciesId: targetSpecies,
          name: `${speciesObj.name} (${traitNames[trait]})`,
          trait,
          colorHex: speciesObj.secondaryHex,
          cssHex: speciesObj.cssHex,
        };

        strains.push(newStrain);
        title = 'ВСПЛЕСК МУТАЦИИ (MUTATION SURGE)';
        description = `Порода ${speciesObj.name} развила штамм [${traitNames[trait]}]!`;
        break;
      }

      case 'DEAD_PATCH': {
        title = 'МЕРТВАЯ ЗОНА (DEAD PATCH)';
        description = 'Токсичный разлом 3x3 временно нейтрализует почву на 4 хода.';
        const cx = prng.rangeInt(-8, 8);
        const cy = prng.rangeInt(-8, 8);

        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const cell = world.getCell(cx + dx, cy + dy);
            if (!cell.isCore) {
              cell.revealed = false;
              cell.reinforcement = 1;
              affectedCells.push(getCellKey(cell.x, cell.y));
            }
          }
        }
        break;
      }

      case 'RESONANCE': {
        title = 'РЕЗОНАНС МИЦЕЛИЯ (RESONANCE)';
        description = 'Энергетический резонанс! Первый построенный квадрат 4x4 за 3 хода даст +2 Перекраски.';
        break;
      }
    }

    const event: WorldEvent = {
      id: `evt_${turn}_${Date.now()}`,
      type,
      title,
      description,
      targetSpeciesId: targetSpecies,
      turn,
      duration: 3,
    };

    return { event, affectedCells };
  }
}
