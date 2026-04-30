import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Platform } from './Platform';

describe('Platform.isDesktop()', () => {
  beforeEach(() => {
    vi.stubGlobal('window', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('returns false when __TAURI_INTERNALS__ is absent', () => {
    expect(Platform.isDesktop()).toBe(false);
  });

  it('returns true when __TAURI_INTERNALS__ is present', () => {
    vi.stubGlobal('window', { __TAURI_INTERNALS__: {} });
    expect(Platform.isDesktop()).toBe(true);
  });
});

describe('Platform browser persistence', () => {
  beforeEach(() => {
    const mockStorage: Record<string, string> = {};
    vi.stubGlobal('localStorage', {
      getItem: vi.fn((key: string) => mockStorage[key] || null),
      setItem: vi.fn((key: string, value: string) => { mockStorage[key] = value; }),
      clear: vi.fn(() => { for (const key in mockStorage) delete mockStorage[key]; }),
    });
    vi.stubGlobal('window', {});
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('loadHighScore() returns 0 when nothing is stored', async () => {
    expect(await Platform.loadHighScore()).toBe(0);
  });

  it('saveHighScore() and loadHighScore() round-trip correctly', async () => {
    await Platform.saveHighScore(9999);
    expect(await Platform.loadHighScore()).toBe(9999);
  });

  it('saveHighScore() overwrites a previous value', async () => {
    await Platform.saveHighScore(100);
    await Platform.saveHighScore(500);
    expect(await Platform.loadHighScore()).toBe(500);
  });

  it('loadHighScore() returns 0 for non-numeric stored value', async () => {
    localStorage.setItem('breakout_high_score', 'garbage');
    expect(await Platform.loadHighScore()).toBe(0);
  });

  it('loadHighScore() returns 0 for a stored value of NaN', async () => {
    localStorage.setItem('breakout_high_score', 'NaN');
    expect(await Platform.loadHighScore()).toBe(0);
  });
});
