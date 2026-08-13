import type { GameStats } from './types';

export interface RunRecord {
  turns: number;
  territory: number;
  largestSquare: number;
  longestChain: number;
  enemiesCaptured: number;
  eventsSurvived: number;
  mutationsEncountered: number;
}

const OVERALL_KEY = 'mycelium_records_v1';
const DAILY_PREFIX = 'mycelium_daily_v1:';

function fromStats(stats: GameStats): RunRecord {
  return { turns: stats.turnCount, territory: stats.maxPlayerTerritory, largestSquare: stats.largestSquareSize, longestChain: stats.maxCombo, enemiesCaptured: stats.enemiesCaptured, eventsSurvived: stats.eventsSurvived, mutationsEncountered: stats.mutationsDiscovered };
}

function merge(a: RunRecord | null, b: RunRecord): RunRecord {
  if (!a) return b;
  return { turns: Math.max(a.turns, b.turns), territory: Math.max(a.territory, b.territory), largestSquare: Math.max(a.largestSquare, b.largestSquare), longestChain: Math.max(a.longestChain, b.longestChain), enemiesCaptured: Math.max(a.enemiesCaptured, b.enemiesCaptured), eventsSurvived: Math.max(a.eventsSurvived, b.eventsSurvived), mutationsEncountered: Math.max(a.mutationsEncountered, b.mutationsEncountered) };
}

export class RecordManager {
  private static read(key: string): RunRecord | null {
    if (typeof window === 'undefined') return null;
    try { return JSON.parse(localStorage.getItem(key) ?? 'null') as RunRecord | null; } catch { return null; }
  }
  public static update(stats: GameStats, dailyKey?: string) {
    if (typeof window === 'undefined') return;
    const run = fromStats(stats);
    localStorage.setItem(OVERALL_KEY, JSON.stringify(merge(this.read(OVERALL_KEY), run)));
    if (dailyKey) {
      const key = DAILY_PREFIX + dailyKey;
      localStorage.setItem(key, JSON.stringify(merge(this.read(key), run)));
    }
  }
}
