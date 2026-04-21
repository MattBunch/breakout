import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Platform } from './Platform';

describe('Platform', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {});
    vi.stubGlobal('localStorage', {
      getItem: vi.fn(),
      setItem: vi.fn(),
    });
  });

  it('isDesktop() returns false when __TAURI_INTERNALS__ is absent', () => {
    expect(Platform.isDesktop()).toBe(false);
  });

  it('isDesktop() returns true when __TAURI_INTERNALS__ is present', () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    expect(Platform.isDesktop()).toBe(true);
  });

  it('loadHighScore() returns 0 when nothing is stored', () => {
    (localStorage.getItem as any).mockReturnValue(null);
    expect(Platform.loadHighScore()).toBe(0);
  });

  it('saveHighScore() and loadHighScore() round-trip correctly', () => {
    let storedValue: string | null = null;
    (localStorage.setItem as any).mockImplementation((_key: string, value: string) => {
      storedValue = value;
    });
    (localStorage.getItem as any).mockImplementation(() => storedValue);

    Platform.saveHighScore(9999);
    expect(Platform.loadHighScore()).toBe(9999);
  });

  it('loadHighScore() returns 0 for non-numeric stored value', () => {
    (localStorage.getItem as any).mockReturnValue('garbage');
    expect(Platform.loadHighScore()).toBe(0);
  });
});
