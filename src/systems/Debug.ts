const DEBUG = false;

export const Debug = {
  log(...args: unknown[]): void {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },

  warn(...args: unknown[]): void {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.warn('[DEBUG WARN]', ...args);
    }
  },
};
