import { vi } from 'vitest';

export function createMockScene() {
  return {
    add: {
      graphics: vi.fn(() => createMockGraphics()),
      text: vi.fn(() => createMockText()),
    },
    input: {
      keyboard: {
        createCursorKeys: vi.fn(() => ({
          left: { isDown: false },
          right: { isDown: false },
        })),
        addKeys: vi.fn(() => ({})),
      },
      on: vi.fn(),
    },
    events: {
      on: vi.fn(),
      off: vi.fn(),
      emit: vi.fn(),
    },
    sys: {
      game: {
        config: { width: 480, height: 640 },
      },
    },
  };
}

export function createMockGraphics() {
  return {
    fillStyle: vi.fn().mockReturnThis(),
    fillRect: vi.fn().mockReturnThis(),
    lineStyle: vi.fn().mockReturnThis(),
    strokeRect: vi.fn().mockReturnThis(),
    clear: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
  };
}

export function createMockText() {
  return {
    setText: vi.fn().mockReturnThis(),
    setOrigin: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    destroy: vi.fn(),
    x: 0,
    y: 0,
  };
}

export function createMockSprite() {
  return {
    x: 0,
    y: 0,
    width: 0,
    height: 0,
    setImmovable: vi.fn().mockReturnThis(),
    setCollideWorldBounds: vi.fn().mockReturnThis(),
    setDisplaySize: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    setTintMode: vi.fn().mockReturnThis(),
    setVelocity: vi.fn().mockReturnThis(),
    setVelocityX: vi.fn().mockReturnThis(),
    setVelocityY: vi.fn().mockReturnThis(),
    setBounce: vi.fn().mockReturnThis(),
    setDepth: vi.fn().mockReturnThis(),
    body: {
      velocity: { x: 0, y: 0 },
      blocked: { up: false, down: false, left: false, right: false },
      speed: 0,
    },
    destroy: vi.fn(),
  };
}
