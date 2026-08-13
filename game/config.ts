export const GAME_CONFIG = {
  chunkSize: 16,
  minSquareSize: 3,
  maxSquareSize: 12,
  eventInterval: 10,

  startingRepaints: 2,
  maxRepaints: 3,

  minZoom: 0.25,
  maxZoom: 2.5,

  // Attack formula defaults
  attackBaseChance: 0.30,
  attackAllySupportBonus: 0.20,
  attackDefenderSupportPenalty: 0.15,
  attackMinChance: 0.10,
  attackMaxChance: 0.95,

  tileSize: 36,
  tileGap: 4,
  tileRadius: 5,
  maxParticles: 200,

  eras: [
    { name: 'ERA I — ORIGIN', startTurn: 1, maxIntents: 1 },
    { name: 'ERA II — COMPETITION', startTurn: 50, maxIntents: 2 },
    { name: 'ERA III — CONQUEST', startTurn: 100, maxIntents: 3 },
    { name: 'ERA IV — SINGULARITY', startTurn: 200, maxIntents: 4 },
  ],

  colors: {
    bg: 0x030305,
    hiddenTile: 0x0a0a0e,
    hiddenTileBorder: 0x141420,
    frontier: 0x1a1a2a,

    species: {
      cyan: {
        id: 'cyan',
        name: 'Cyan Spire',
        title: 'Architect',
        hex: 0x00e5ff,
        cssHex: '#00e5ff',
        secondaryHex: 0x70ffff,
        glowHex: 0x00a8ff,
        passiveName: 'STRUCTURAL MEMORY',
        passiveDesc: 'Reinforced square interiors gain double defensive resilience.',
      },
      coral: {
        id: 'coral',
        name: 'Coral Bloom',
        title: 'Predator',
        hex: 0xff4757,
        cssHex: '#ff4757',
        secondaryHex: 0xff7885,
        glowHex: 0xff6b81,
        passiveName: 'FEAST',
        passiveDesc: 'First captured enemy tile each turn costs less energy to claim.',
      },
      yellow: {
        id: 'yellow',
        name: 'Sol Flare',
        title: 'Explorer',
        hex: 0xffa502,
        cssHex: '#ffa502',
        secondaryHex: 0xffc048,
        glowHex: 0xeccc68,
        passiveName: 'SENSE',
        passiveDesc: 'Every 3rd turn, highest confidence frontier tile prediction is guaranteed.',
      },
      magenta: {
        id: 'magenta',
        name: 'Velvet Pulse',
        title: 'Parasite',
        hex: 0xff007f,
        cssHex: '#ff007f',
        secondaryHex: 0xff54a8,
        glowHex: 0xe84393,
        passiveName: 'GRAFT',
        passiveDesc: 'Repaints on enemy tiles connect immediately into square detection.',
      },
      violet: {
        id: 'violet',
        name: 'Void Lotus',
        title: 'Fortress',
        hex: 0xa55eea,
        cssHex: '#a55eea',
        secondaryHex: 0xc896ff,
        glowHex: 0x8854d0,
        passiveName: 'ROOTED',
        passiveDesc: 'Territory directly adjacent to Core starts automatically reinforced.',
      },
    }
  }
} as const;

export type SpeciesId = 'cyan' | 'coral' | 'yellow' | 'magenta' | 'violet';
