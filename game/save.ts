import { SaveData } from './types';

const SAVE_KEY = 'fungal_conquest_save_v1';

export class SaveManager {
  public static save(data: SaveData): boolean {
    if (typeof window === 'undefined') return false;
    try {
      const json = JSON.stringify(data);
      localStorage.setItem(SAVE_KEY, json);
      return true;
    } catch (e) {
      console.warn('Failed to save game to localStorage:', e);
      return false;
    }
  }

  public static load(): SaveData | null {
    if (typeof window === 'undefined') return null;
    try {
      const raw = localStorage.getItem(SAVE_KEY);
      if (!raw) return null;
      return JSON.parse(raw) as SaveData;
    } catch (e) {
      console.warn('Failed to load game from localStorage:', e);
      return null;
    }
  }

  public static hasSave(): boolean {
    if (typeof window === 'undefined') return false;
    return !!localStorage.getItem(SAVE_KEY);
  }

  public static clearSave(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(SAVE_KEY);
  }
}
