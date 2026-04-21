/**
 * Platform.ts — Isolates all platform-specific branching.
 * Browser: localStorage for persistence, manual audio unlock required.
 * Desktop (Tauri): file system API for persistence, audio works immediately.
 */

const HIGH_SCORE_KEY = 'breakout_high_score';

export const Platform = {
  /**
   * Returns true when running inside Tauri (desktop).
   * All platform branching in the codebase must go through this method —
   * never call isTauri() directly outside this file.
   */
  isDesktop(): boolean {
    return typeof window !== 'undefined' &&
      '__TAURI_INTERNALS__' in window;
  },

  saveHighScore(score: number): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      // Storage unavailable — silently ignore
    }
  },

  loadHighScore(): number {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      if (raw === null) {
        return 0;
      }
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  },
};
