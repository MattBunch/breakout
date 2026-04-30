import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrickGrid, BRICK_ROW_DATA_KEY } from './BrickGrid';
import { Balance } from '../config/Balance';

vi.mock('phaser', () => ({
  TintModes: { FILL: 1 },
}));

function createMockBrick() {
  return {
    setDisplaySize: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    setTintMode: vi.fn().mockReturnThis(),
    setData: vi.fn(),
    getData: vi.fn((key: string) => key === BRICK_ROW_DATA_KEY ? 0 : undefined),
    destroy: vi.fn(),
  };
}

function createMockScene() {
  const bricks: any[] = [];
  return {
    sys: { game: { config: { width: 480, height: 640 } } },
    physics: {
      add: {
        staticGroup: vi.fn(() => ({
          create: vi.fn(() => {
            const b = createMockBrick();
            bricks.push(b);
            return b;
          }),
          refresh: vi.fn(),
          clear: vi.fn(),
          getChildren: vi.fn(() => bricks),
        })),
      },
    },
  };
}

describe('BrickGrid', () => {
  let grid: BrickGrid;

  beforeEach(() => {
    grid = new BrickGrid(
      createMockScene() as unknown as import('phaser').Scene,
    );
  });

  it('constructs without throwing', () => {
    expect(grid).toBeDefined();
  });

  it('creates the correct total number of bricks', () => {
    const expected = Balance.BRICK_ROWS * Balance.BRICK_COLS;
    expect(grid.getRemainingCount()).toBe(expected);
  });

  it('getRemainingCount() decrements correctly', () => {
    const initial = grid.getRemainingCount();
    grid.decrementRemaining();
    expect(grid.getRemainingCount()).toBe(initial - 1);
  });

  it('getGroup() returns the static group', () => {
    expect(grid.getGroup()).toBeDefined();
  });

  it('destroy() calls group.clear()', () => {
    const group = grid.getGroup() as unknown as {
      clear: ReturnType<typeof vi.fn>;
    };
    grid.destroy();
    expect(group.clear).toHaveBeenCalledWith(true, true);
  });
});
