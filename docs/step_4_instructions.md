# Step 4 Agent Instructions — Brick Field

## Prerequisites
- Steps 1–3 are complete and `npm test` passes with all tests green.
- `npm run dev` shows the canvas with walls, ceiling, a working paddle, and a ball that bounces.
- Working directory: `breakout/`

---

## Overview

This step adds a `BrickGrid` entity to `src/entities/` that spawns the full brick field into a Phaser `StaticGroup`. Per AGENTS.md, bricks must use a static group — they do not move, and static bodies are significantly cheaper than dynamic ones. The ball–brick collider is registered in `GameScene`. The collision callback does minimum work only: destroy the brick and emit `Events.BRICK_DESTROYED` with the brick's row index. All score and speed logic that follows from that event is handled by `GameState`, which is already wired from previous steps.

Row colours from `Balance.ROW_COLORS` are applied via Phaser 4's `setTint().setTintMode(TintModes.FILL)`. Each row pair gets a distinct colour matching the GAME_DESIGN.md spec (red, orange, green, yellow top to bottom).

---

## Step 1 — Update `src/config/Balance.ts`

No values change. Confirm the following constants are present with these exact values. The brick layout math depends on them:

```
CANVAS_WIDTH:    480
WALL_THICKNESS:  8
BRICK_ROWS:      8
BRICK_COLS:      14
BRICK_WIDTH:     28
BRICK_HEIGHT:    16
BRICK_PADDING:   4
BRICK_OFFSET_TOP: 80
BRICK_OFFSET_LEFT: 10
ROW_SCORES:      [7, 7, 5, 5, 3, 3, 1, 1]
ROW_COLORS:      [0xff4444, 0xff4444, 0xff8800, 0xff8800,
                  0x44dd44, 0x44dd44, 0xffdd00, 0xffdd00]
```

Layout sanity check — run this mentally before proceeding:
- Total brick field width: `14 × 28 + 13 × 4 = 444px`
- Available play width: `480 - 8 - 8 = 464px`
- Left margin for centering: `(464 - 444) / 2 + 8 = 18px`

The centering offset is calculated dynamically in `BrickGrid` — do not hardcode 18. `BRICK_OFFSET_LEFT` is kept in `Balance.ts` as a fallback minimum margin only.

---

## Step 2 — Create `src/entities/BrickGrid.ts`

```ts
/**
 * BrickGrid.ts — Spawns and manages the full brick field.
 *
 * Responsibilities:
 *   - Creates all bricks in a StaticGroup (bricks do not move)
 *   - Applies per-row tint using Phaser 4's TintModes.FILL
 *   - Stores each brick's row index on the game object so the collision
 *     callback can emit the correct row index with BRICK_DESTROYED
 *   - Exposes getGroup() so GameScene can register the collider
 *   - Exposes getRemainingCount() so GameScene can detect level clear
 *
 * What BrickGrid does NOT do:
 *   - Does not listen for or handle BRICK_DESTROYED itself
 *   - Does not update score, lives, or ball speed
 *   - Does not register its own collider — that is the scene's job
 */
import { Scene, TintModes } from 'phaser';
import { ArcadePhysics } from '@phaser/physics/arcade';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';

/** Key used to store the row index on each brick game object. */
export const BRICK_ROW_DATA_KEY = 'rowIndex';

export class BrickGrid {
  private group: ArcadePhysics.StaticGroup;
  private remainingCount: number = 0;

  constructor(scene: Scene) {
    this.group = ArcadePhysics.createStaticGroup(scene);
    this.spawnBricks(scene);
  }

  getGroup(): ArcadePhysics.StaticGroup {
    return this.group;
  }

  getRemainingCount(): number {
    return this.remainingCount;
  }

  decrementRemaining(): void {
    this.remainingCount -= 1;
  }

  destroy(): void {
    this.group.clear(true, true);
  }

  private spawnBricks(scene: Scene): void {
    const { width } = scene.sys.game.config as { width: number };
    const t = Balance.WALL_THICKNESS;

    // Calculate horizontal centering offset so the brick field
    // sits symmetrically within the play area walls.
    const playWidth = (width as number) - t * 2;
    const fieldWidth =
      Balance.BRICK_COLS * Balance.BRICK_WIDTH +
      (Balance.BRICK_COLS - 1) * Balance.BRICK_PADDING;
    const offsetLeft = t + Math.max(
      Balance.BRICK_OFFSET_LEFT,
      Math.floor((playWidth - fieldWidth) / 2),
    );

    for (let row = 0; row < Balance.BRICK_ROWS; row++) {
      const y =
        Balance.BRICK_OFFSET_TOP +
        row * (Balance.BRICK_HEIGHT + Balance.BRICK_PADDING) +
        Balance.BRICK_HEIGHT / 2;

      const color = Balance.ROW_COLORS[row] ?? 0xffffff;

      for (let col = 0; col < Balance.BRICK_COLS; col++) {
        const x =
          offsetLeft +
          col * (Balance.BRICK_WIDTH + Balance.BRICK_PADDING) +
          Balance.BRICK_WIDTH / 2;

        const brick = this.group.create(x, y, AssetKeys.BRICK) as
          Phaser.GameObjects.Image & {
            setData: (key: string, value: unknown) => void;
          };

        brick.setDisplaySize(Balance.BRICK_WIDTH, Balance.BRICK_HEIGHT);
        brick.setTint(color).setTintMode(TintModes.FILL);
        brick.setData(BRICK_ROW_DATA_KEY, row);

        this.remainingCount += 1;
      }
    }

    // Refresh static bodies after all bricks are placed.
    // Required in Phaser 4 after bulk-creating StaticGroup members.
    this.group.refresh();
  }
}
```

**Notes:**
- `ArcadePhysics.createStaticGroup(scene)` is the Phaser 4 pattern. Do not use `this.physics.add.staticGroup()`.
- `setTint(color).setTintMode(TintModes.FILL)` is the Phaser 4 tinting API. `setTintFill()` was removed in Phaser 4 — do not use it.
- `brick.setData(BRICK_ROW_DATA_KEY, row)` stores the row index directly on the game object. The collision callback reads this back with `brick.getData(BRICK_ROW_DATA_KEY)` to determine the score value for that row.
- `this.group.refresh()` must be called after all static bodies are created in bulk. Without it, the physics engine does not know the final positions of the bodies and collision detection will be unreliable.
- `BrickGrid` does not call `brick.destroy()` itself. The collision callback in `GameScene` destroys individual bricks. `BrickGrid.destroy()` is for full teardown (scene restart).
- `remainingCount` is decremented externally via `decrementRemaining()` rather than by listening to `BRICK_DESTROYED` internally. This keeps `BrickGrid` stateless with respect to events and easier to test.

---

## Step 3 — Create `src/entities/BrickGrid.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { BrickGrid, BRICK_ROW_DATA_KEY } from './BrickGrid';
import { Balance } from '../config/Balance';

vi.mock('phaser', () => ({
  TintModes: { FILL: 1 },
}));

vi.mock('@phaser/physics/arcade', () => {
  const mockBrick = () => ({
    setDisplaySize: vi.fn().mockReturnThis(),
    setTint: vi.fn().mockReturnThis(),
    setTintMode: vi.fn().mockReturnThis(),
    setData: vi.fn(),
    getData: vi.fn((key: string) => key === BRICK_ROW_DATA_KEY ? 0 : undefined),
    destroy: vi.fn(),
  });

  const bricks: ReturnType<typeof mockBrick>[] = [];

  return {
    ArcadePhysics: {
      createStaticGroup: vi.fn(() => ({
        create: vi.fn(() => {
          const b = mockBrick();
          bricks.push(b);
          return b;
        }),
        refresh: vi.fn(),
        clear: vi.fn(),
        getChildren: vi.fn(() => bricks),
      })),
    },
  };
});

function createMockScene() {
  return {
    sys: { game: { config: { width: 480, height: 640 } } },
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
```

---

## Step 4 — Update `src/scenes/GameScene.ts`

Replace the existing file with this version that adds the `BrickGrid`, registers the ball–brick collider, and handles level clear:

```ts
/**
 * GameScene.ts — Core gameplay scene.
 *
 * Step 4 additions:
 *   - BrickGrid entity created
 *   - ArcadePhysics collider registered between ball and brick group
 *   - onBallHitBrick callback: destroy brick, emit BRICK_DESTROYED
 *   - BRICK_DESTROYED handler: decrement remaining count, check level clear
 *   - gameState subscribes to BRICK_DESTROYED to update score and speed
 */
import { Scene, GameObjects } from 'phaser';
import { ArcadePhysics } from '@phaser/physics/arcade';
import { SceneKeys } from '../config/SceneKeys';
import { Balance } from '../config/Balance';
import { Paddle } from '../entities/Paddle';
import { Ball } from '../entities/Ball';
import { BrickGrid } from '../entities/BrickGrid';
import { BRICK_ROW_DATA_KEY } from '../entities/BrickGrid';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';

const WALL_COLOR = 0x8888ff;
const CEILING_COLOR = 0x8888ff;

interface GameSceneState {
  paddle: Paddle;
  ball: Ball;
  brickGrid: BrickGrid;
}

export const GameScene: Scene = {
  key: SceneKeys.GAME,

  create() {
    const { width, height } = this.sys.game.config as {
      width: number;
      height: number;
    };
    const t = Balance.WALL_THICKNESS;
    const self = this as unknown as GameSceneState;

    gameState.reset();

    // World bounds — left/right/top solid, bottom open
    this.physics.world.setBounds(
      t, t, width - t * 2, height - t,
      true, true, true, false,
    );

    // Visual walls and ceiling
    const gfx = this.add.graphics();
    gfx.fillStyle(WALL_COLOR, 1);
    gfx.fillRect(0, 0, t, height);
    gfx.fillStyle(WALL_COLOR, 1);
    gfx.fillRect(width - t, 0, t, height);
    gfx.fillStyle(CEILING_COLOR, 1);
    gfx.fillRect(0, 0, width, t);

    // Entities
    self.paddle = new Paddle(this);
    self.ball = new Ball(this, self.paddle.getX(), self.paddle.getY());
    self.brickGrid = new BrickGrid(this);

    // Ball ↔ Paddle collider
    ArcadePhysics.addCollider(
      this,
      self.ball.getSprite(),
      self.paddle.getSprite(),
      () => {
        onBallHitPaddle(self.ball, self.paddle);
      },
    );

    // Ball ↔ Brick collider
    ArcadePhysics.addCollider(
      this,
      self.ball.getSprite(),
      self.brickGrid.getGroup(),
      (
        _ball: GameObjects.GameObject,
        brick: GameObjects.GameObject,
      ) => {
        onBallHitBrick(brick, self.brickGrid);
      },
    );

    // GameState wires into BRICK_DESTROYED to update score and speed
    EventBus.on(Events.BRICK_DESTROYED, ({ rowIndex }: { rowIndex: number }) => {
      gameState.onBrickDestroyed(rowIndex);
      self.ball.incrementSpeed();
    });

    // Life lost — reset ball and paddle
    EventBus.on(Events.LIFE_LOST, () => {
      gameState.onLifeLost();
      if (gameState.getLives() > 0) {
        self.paddle.resetToCenter(width);
        self.ball.resetToPaddle(self.paddle.getX(), self.paddle.getY());
      }
    });

    // Game over — stub: restart scene until GameOverScene exists
    EventBus.on(Events.GAME_OVER, () => {
      self.brickGrid.destroy();
      this.scene.restart();
    });

    // Clean up all EventBus listeners on scene shutdown
    this.events.on('shutdown', () => {
      EventBus.off(Events.BRICK_DESTROYED);
      EventBus.off(Events.LIFE_LOST);
      EventBus.off(Events.GAME_OVER);
    });

    // HUD runs in parallel
    this.scene.launch(SceneKeys.HUD);
  },

  update(_time: number, delta: number) {
    const self = this as unknown as GameSceneState;
    self.paddle.update(delta);
    self.ball.update(delta);
  },
};

// ---------------------------------------------------------------------------
// Collision handlers — minimum work only (see AGENTS.md)
// ---------------------------------------------------------------------------

function onBallHitBrick(
  brick: GameObjects.GameObject,
  brickGrid: BrickGrid,
): void {
  const rowIndex = (brick as GameObjects.GameObject & {
    getData: (key: string) => number;
  }).getData(BRICK_ROW_DATA_KEY);

  brick.destroy();
  brickGrid.decrementRemaining();
  EventBus.emit(Events.BRICK_DESTROYED, { rowIndex });

  if (brickGrid.getRemainingCount() <= 0) {
    EventBus.emit(Events.LEVEL_CLEAR);
  }
}

function onBallHitPaddle(ball: Ball, paddle: Paddle): void {
  const ballX = ball.getSprite().x;
  const paddleX = paddle.getX();
  const halfWidth = paddle.getWidth() / 2;

  const hitPos = Math.max(-1, Math.min(1, (ballX - paddleX) / halfWidth));
  const speed = gameState.getBallSpeed();
  const maxAngleRad = (70 * Math.PI) / 180;
  const angle = hitPos * maxAngleRad;

  ball.getSprite().setVelocity(
    Math.sin(angle) * speed,
    -Math.abs(Math.cos(angle) * speed),
  );
}
```

**Notes:**
- `onBallHitBrick` does exactly three things: reads the row index off the brick, destroys the brick, and emits `BRICK_DESTROYED`. Nothing else. Score and speed updates happen in the `BRICK_DESTROYED` listener, not here.
- `Events.LEVEL_CLEAR` is emitted when `remainingCount` reaches zero. Add it to `src/config/Events.ts` in the next step below.
- The `BRICK_DESTROYED` listener in the scene calls both `gameState.onBrickDestroyed(rowIndex)` and `ball.incrementSpeed()`. This matches the authoritative data flow in GAME_DESIGN.md exactly.
- The `EventBus.off` calls in the `shutdown` handler still use event-name-only form. If listener accumulation becomes a problem across scene restarts, switch to named handler references — see the note at the bottom of this file.

---

## Step 5 — Update `src/config/Events.ts`

Add `LEVEL_CLEAR` to the events map:

```ts
export const Events = {
  BRICK_DESTROYED:  'brick_destroyed',
  SCORE_CHANGED:    'score_changed',
  LIFE_LOST:        'life_lost',
  GAME_OVER:        'game_over',
  BALL_CEILING_HIT: 'ball_ceiling_hit',
  BALL_RESET:       'ball_reset',
  LEVEL_CLEAR:      'level_clear',
} as const;

export type EventKey = (typeof Events)[keyof typeof Events];
```

---

## Step 6 — Run the tests

```bash
npm test
```

Expected: all previous tests still pass plus the 5 new `BrickGrid` tests. Fix any failures before continuing.

---

## Step 7 — Browser verification (`npm run dev`)

```bash
npm run dev
```

Verify the following:

- Eight rows of 14 bricks are visible in the upper portion of the canvas.
- Row colours from top to bottom are: red, red, orange, orange, green, green, yellow, yellow.
- The brick field is horizontally centred between the walls.
- There is a visible gap between the ceiling and the first brick row.
- Launching the ball and hitting a brick causes that brick to disappear immediately.
- The ball bounces off the brick on contact.
- Multiple bricks can be destroyed in sequence.
- When all bricks are destroyed the scene restarts (level clear stub — full scene comes in a later step).

---

## Step 8 — Desktop verification (`npm run tauri:dev`)

```bash
npm run tauri:dev
```

Verify the same checklist as Step 7. Additionally confirm:

- Brick colours render correctly inside the Tauri WebView. Tinting is GPU-accelerated — if colours appear wrong or washed out on desktop, confirm `TintModes.FILL` is being used, not `TintModes.ADD` (additive blending will look different on dark backgrounds).
- The game does not stall or freeze when all bricks are destroyed and the scene restarts.

> **Note:** `tauri:dev` requires Rust to be installed. If Rust is not set up, verify in the browser only. All game logic is identical on both targets.

---

## Notes for the next agent

- `Events.LEVEL_CLEAR` is now emitted but nothing meaningful handles it yet. A `LevelClearScene` or in-game message should be added in a later step.
- `EventBus.off(eventName)` with no handler reference removes **all** listeners for that event. This is fine while each event has only one listener, but will become a bug as the HUD and other systems add their own listeners in coming steps. Before adding a second listener to any event, refactor the `shutdown` handler to use named function references: `EventBus.off(Events.BRICK_DESTROYED, onBrickDestroyed)`.
- Ball speed is now increasing as bricks are destroyed. If the speed feels wrong during playtesting, adjust `Balance.BALL_SPEED_INCREMENT` — do not change the increment inline in any scene or entity file.
- Row scoring is fully wired through `gameState.onBrickDestroyed(rowIndex)` — top rows are worth more than bottom rows per `Balance.ROW_SCORES`. The score display in the HUD will reflect this automatically since `GameState` emits `SCORE_CHANGED` after every brick.
- The next logical step is adding a proper score display, lives counter, and game over / level clear scenes so the game has a complete loop.
- Do not add a bottom wall to the world bounds. Do not use class-based scenes. Do not use `this.physics.add.*` or `import Phaser from 'phaser'`. See AGENTS.md.
