import type { SaveData } from './types';

const SAVE_KEY = 'mycelium_save_v5';
const LEGACY_KEYS = ['fungal_conquest_save_v1'];
export const SAVE_VERSION = 5;

export class SaveManager {
  public static save(data: SaveData): boolean {
    if (typeof window === 'undefined') return false;
    try {
      localStorage.setItem(SAVE_KEY, JSON.stringify(data));
      return true;
    } catch {
      return false;
    }
  }

  public static load(): SaveData | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      const parsed = JSON.parse(raw) as SaveData;
      if (parsed.version !== SAVE_VERSION || !Array.isArray(parsed.cells)) {
        localStorage.removeItem(SAVE_KEY);
        return null;
      }
      return parsed;
    } catch {
      localStorage.removeItem(SAVE_KEY);
      return null;
    }
  }

  public static hasSave(): boolean {
    return this.load() !== null;
  }

  public static clearSave(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SAVE_KEY);
    for (const key of LEGACY_KEYS) localStorage.removeItem(key);
  }
}
