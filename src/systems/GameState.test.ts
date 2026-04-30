import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from './GameState';
import { Balance } from '../config/Balance';

vi.mock('./EventBus', () => ({
  EventBus: { emit: vi.fn() },
}));

vi.mock('./Platform', () => ({
  Platform: {
    loadHighScore: vi.fn(async () => 0),
    saveHighScore: vi.fn(async () => {}),
  },
}));

describe('GameState', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState();
    vi.clearAllMocks();
  });

  it('initialises with correct defaults', () => {
    expect(state.getScore()).toBe(0);
    expect(state.getLives()).toBe(Balance.LIVES_START);
    expect(state.getBallSpeed()).toBe(Balance.BALL_SPEED_INITIAL);
    expect(state.getHighScore()).toBe(0);
  });

  it('init() loads high score from Platform', async () => {
    const { Platform } = await import('./Platform');
    vi.mocked(Platform.loadHighScore).mockResolvedValueOnce(1234);
    await state.init();
    expect(state.getHighScore()).toBe(1234);
  });

  it('reset() restores session state but not high score', async () => {
    const { Platform } = await import('./Platform');
    vi.mocked(Platform.loadHighScore).mockResolvedValueOnce(500);
    await state.init();
    state.onBrickDestroyed(0);
    state.reset();
    expect(state.getScore()).toBe(0);
    expect(state.getLives()).toBe(Balance.LIVES_START);
    expect(state.getBallSpeed()).toBe(Balance.BALL_SPEED_INITIAL);
    expect(state.getHighScore()).toBe(500);
  });

  it('onBrickDestroyed() increments score by row points', () => {
    state.onBrickDestroyed(0);
    expect(state.getScore()).toBe(7);
    state.onBrickDestroyed(4);
    expect(state.getScore()).toBe(10);
  });

  it('onBrickDestroyed() increases ball speed', () => {
    const before = state.getBallSpeed();
    state.onBrickDestroyed(0);
    expect(state.getBallSpeed()).toBe(before + Balance.BALL_SPEED_INCREMENT);
  });

  it('ball speed does not exceed BALL_SPEED_MAX', () => {
    const steps = Math.ceil(
      (Balance.BALL_SPEED_MAX - Balance.BALL_SPEED_INITIAL) /
        Balance.BALL_SPEED_INCREMENT,
    );
    for (let i = 0; i <= steps + 10; i++) {
      state.onBrickDestroyed(7);
    }
    expect(state.getBallSpeed()).toBe(Balance.BALL_SPEED_MAX);
  });

  it('onLifeLost() decrements lives', () => {
    state.onLifeLost();
    expect(state.getLives()).toBe(Balance.LIVES_START - 1);
  });

  it('onLifeLost() does not go below zero lives', () => {
    for (let i = 0; i < Balance.LIVES_START + 5; i++) {
      state.onLifeLost();
    }
    expect(state.getLives()).toBe(0);
  });

  it('high score updates when score exceeds it on game over', async () => {
    const { Platform } = await import('./Platform');
    state.onBrickDestroyed(0); // +7
    state.onBrickDestroyed(0); // +7 → total 14
    for (let i = 0; i < Balance.LIVES_START; i++) {
      state.onLifeLost();
    }
    expect(state.getHighScore()).toBe(14);
    expect(Platform.saveHighScore).toHaveBeenCalledWith(14);
  });

  it('high score does not update when score is lower', async () => {
    const { Platform } = await import('./Platform');
    vi.mocked(Platform.loadHighScore).mockResolvedValueOnce(9999);
    await state.init();
    for (let i = 0; i < Balance.LIVES_START; i++) {
      state.onLifeLost();
    }
    expect(state.getHighScore()).toBe(9999);
    expect(Platform.saveHighScore).not.toHaveBeenCalled();
  });
});
