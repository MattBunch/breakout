import { describe, it, expect, beforeEach, vi } from 'vitest';
import { GameState } from './GameState';
import { Balance } from '../config/Balance';

vi.mock('./EventBus', () => ({
  EventBus: { emit: vi.fn() },
}));

describe('GameState', () => {
  let state: GameState;

  beforeEach(() => {
    state = new GameState();
  });

  it('initialises with correct defaults', () => {
    expect(state.getScore()).toBe(0);
    expect(state.getLives()).toBe(Balance.LIVES_START);
    expect(state.getBallSpeed()).toBe(Balance.BALL_SPEED_INITIAL);
  });

  it('reset() restores defaults', () => {
    state.onBrickDestroyed(0);
    state.reset();
    expect(state.getScore()).toBe(0);
    expect(state.getLives()).toBe(Balance.LIVES_START);
    expect(state.getBallSpeed()).toBe(Balance.BALL_SPEED_INITIAL);
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
    const stepsToMax = Math.ceil(
      (Balance.BALL_SPEED_MAX - Balance.BALL_SPEED_INITIAL) / Balance.BALL_SPEED_INCREMENT,
    );
    for (let i = 0; i <= stepsToMax + 10; i++) {
      state.onBrickDestroyed(7);
    }
    expect(state.getBallSpeed()).toBe(Balance.BALL_SPEED_MAX);
  });

  it('onLifeLost() decrements lives', () => {
    state.onLifeLost();
    expect(state.getLives()).toBe(Balance.LIVES_START - 1);
  });

  it('onLifeLost() does not go below zero', () => {
    for (let i = 0; i < Balance.LIVES_START + 5; i++) {
      state.onLifeLost();
    }
    expect(state.getLives()).toBe(0);
  });
});
