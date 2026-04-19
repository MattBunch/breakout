import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Paddle } from './Paddle';

// Mock the entire Phaser + ArcadePhysics surface the Paddle touches
vi.mock('phaser', () => ({
  Input: {
    Keyboard: {
      KeyCodes: { A: 65, D: 68 },
    },
  },
  Physics: {
    Arcade: {
      Sprite: vi.fn(),
    },
  },
}));

function createMockSprite() {
  return {
    x: 240,
    y: 580,
    displayWidth: 100,
    displayHeight: 14,
    setImmovable: vi.fn().mockReturnThis(),
    setCollideWorldBounds: vi.fn().mockReturnThis(),
    setDisplaySize: vi.fn().mockReturnThis(),
    setVelocityX: vi.fn().mockReturnThis(),
    setX: vi.fn(function (this: { x: number }, x: number) {
      this.x = x;
      return this;
    }),
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
        createCursorKeys: vi.fn(() => ({
          left: { isDown: false },
          right: { isDown: false },
        })),
        addKeys: vi.fn(() => ({
          left: { isDown: false },
          right: { isDown: false },
        })),
        on: vi.fn(),
      },
      on: vi.fn(),
    },
  };
}

describe('Paddle', () => {
  let paddle: Paddle;
  let mockScene: ReturnType<typeof createMockScene>;

  beforeEach(() => {
    mockScene = createMockScene();
    paddle = new Paddle(mockScene as unknown as import('phaser').Scene);
  });

  it('constructs without throwing', () => {
    expect(paddle).toBeDefined();
  });

  it('getX() returns the sprite x position', () => {
    expect(typeof paddle.getX()).toBe('number');
  });

  it('getY() returns the sprite y position', () => {
    expect(typeof paddle.getY()).toBe('number');
  });

  it('setWidth() calls setDisplaySize with correct height', () => {
    const sprite = paddle.getSprite() as unknown as {
      setDisplaySize: ReturnType<typeof vi.fn>;
    };
    paddle.setWidth(60);
    expect(sprite.setDisplaySize).toHaveBeenCalledWith(60, expect.any(Number));
  });

  it('resetToCenter() sets x to half scene width', () => {
    const sprite = paddle.getSprite() as unknown as {
      setX: ReturnType<typeof vi.fn>;
      setVelocityX: ReturnType<typeof vi.fn>;
    };
    paddle.resetToCenter(480);
    expect(sprite.setX).toHaveBeenCalledWith(240);
    expect(sprite.setVelocityX).toHaveBeenCalledWith(0);
  });

  it('destroy() calls sprite.destroy()', () => {
    const sprite = paddle.getSprite() as unknown as {
      destroy: ReturnType<typeof vi.fn>;
    };
    paddle.destroy();
    expect(sprite.destroy).toHaveBeenCalled();
  });
});
