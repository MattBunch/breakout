/**
 * Platform.ts — Isolates all platform-specific branching.
 *
 * Browser:  localStorage for high score persistence.
 * Desktop:  Tauri file system plugin writes a JSON file to $APPDATA.
 *
 * All callers use saveHighScore() and loadHighScore() — they never know
 * which branch ran. No other file in the codebase imports from
 * @tauri-apps/api or touches localStorage directly.
 */

const HIGH_SCORE_KEY = 'breakout_high_score';
const HIGH_SCORE_FILENAME = 'highscore.json';

export const Platform = {
  /**
   * Returns true when running inside Tauri (desktop).
   * Uses a synchronous window property check — safe to call anywhere,
   * including during scene setup before any async operations.
   */
  isDesktop(): boolean {
    return (
      typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    );
  },

  /**
   * Persists the high score for the current platform.
   * Fire-and-forget — callers do not await this.
   */
  async saveHighScore(score: number): Promise<void> {
    if (Platform.isDesktop()) {
      await Platform._saveTauri(score);
    } else {
      Platform._saveBrowser(score);
    }
  },

  /**
   * Loads the persisted high score for the current platform.
   * Returns 0 if nothing is stored or if any error occurs.
   */
  async loadHighScore(): Promise<number> {
    if (Platform.isDesktop()) {
      return Platform._loadTauri();
    } else {
      return Platform._loadBrowser();
    }
  },

  // ------------------------------------------------------------------
  // Browser branch
  // ------------------------------------------------------------------

  _saveBrowser(score: number): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      // Storage unavailable — silently ignore
    }
  },

  _loadBrowser(): number {
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

  // ------------------------------------------------------------------
  // Tauri branch
  // ------------------------------------------------------------------

  async _saveTauri(score: number): Promise<void> {
    try {
      const { writeTextFile, BaseDirectory } = await import(
        '@tauri-apps/plugin-fs'
      );
      await writeTextFile(
        HIGH_SCORE_FILENAME,
        JSON.stringify({ score }),
        { baseDir: BaseDirectory.AppData },
      );
    } catch {
      // File write failed — silently ignore
    }
  },

  async _loadTauri(): Promise<number> {
    try {
      const { readTextFile, BaseDirectory, exists } = await import(
        '@tauri-apps/plugin-fs'
      );
      const fileExists = await exists(HIGH_SCORE_FILENAME, {
        baseDir: BaseDirectory.AppData,
      });
      if (!fileExists) {
        return 0;
      }
      const raw = await readTextFile(HIGH_SCORE_FILENAME, {
        baseDir: BaseDirectory.AppData,
      });
      const parsed = JSON.parse(raw) as { score?: unknown };
      const score = Number(parsed.score);
      return isNaN(score) ? 0 : score;
    } catch {
      return 0;
    }
  },
};
