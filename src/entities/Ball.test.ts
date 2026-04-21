import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Ball } from './Ball';

vi.mock('phaser', () => ({
  Input: {
    Keyboard: {
      KeyCodes: { SPACE: 32 },
      JustDown: vi.fn(() => false),
    },
  },
  Physics: {
    Arcade: {
      Sprite: vi.fn(),
    },
  },
}));

vi.mock('../systems/EventBus', () => ({
  EventBus: { emit: vi.fn() },
}));

vi.mock('../systems/GameState', () => ({
  gameState: {
    getBallSpeed: vi.fn(() => 300),
  },
}));

function createMockSprite() {
  return {
    x: 240,
    y: 560,
    setBounce: vi.fn().mockReturnThis(),
    setCollideWorldBounds: vi.fn().mockReturnThis(),
    setDisplaySize: vi.fn().mockReturnThis(),
    setVelocity: vi.fn().mockReturnThis(),
    setVelocityX: vi.fn().mockReturnThis(),
    setVelocityY: vi.fn().mockReturnThis(),
    setX: vi.fn().mockReturnThis(),
    setY: vi.fn().mockReturnThis(),
    body: {
      velocity: { x: 0, y: -300 },
      blocked: { up: false, down: false, left: false, right: false },
      speed: 300,
    },
    destroy: vi.fn(),
  };
}

function createMockScene() {
  return {
    sys: { game: { config: { width: 480, height: 640 } } },
    physics: {
      add: {
        sprite: vi.fn(() => createMockSprite()),
      },
    },
    input: {
      keyboard: {
        addKey: vi.fn(() => ({ isDown: false })),
        on: vi.fn(),
      },
      on: vi.fn(),
    },
  };
}

describe('Ball', () => {
  let ball: Ball;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    ball = new Ball(
      mockScene as unknown as import('phaser').Scene,
      240,
      580,
    );
  });

  it('constructs without throwing', () => {
    expect(ball).toBeDefined();
  });

  it('is not live on construction', () => {
    expect(ball.getIsLive()).toBe(false);
  });

  it('getSprite() returns the underlying sprite', () => {
    expect(ball.getSprite()).toBeDefined();
  });

  it('resetToPaddle() sets isLive to false', () => {
    ball.resetToPaddle(240, 580);
    expect(ball.getIsLive()).toBe(false);
  });

  it('destroy() calls sprite.destroy()', () => {
    const sprite = ball.getSprite() as unknown as {
      destroy: ReturnType<typeof vi.fn>;
    };
    ball.destroy();
    expect(sprite.destroy).toHaveBeenCalled();
  });

  it('incrementSpeed() does not throw when velocity is zero', () => {
    const sprite = ball.getSprite() as unknown as {
      body: { velocity: { x: number; y: number } };
    };
    sprite.body.velocity.x = 0;
    sprite.body.velocity.y = 0;
    expect(() => ball.incrementSpeed()).not.toThrow();
  });
});
