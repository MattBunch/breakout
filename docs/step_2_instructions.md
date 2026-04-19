# Step 2 Agent Instructions — Paddle with Player Input

## Prerequisites
- Step 1 is complete and `npm test` passes with all 7 tests green.
- `npm run dev` shows the black canvas with blue walls and ceiling.
- Working directory: `breakout/`

---

## Overview

This step adds a `Paddle` entity to `src/entities/` following the entity pattern from AGENTS.md — a class that wraps a Phaser physics sprite and exposes a clean interface. The scene never touches `paddle.sprite` directly. Input handling (keyboard + mouse/touch) lives inside the entity's `update()` method, not in the scene. The scene's only job is to create the paddle and call `paddle.update(delta)` each frame.

---

## Step 1 — Create `src/entities/Paddle.ts`

```ts
/**
 * Paddle.ts — Player-controlled paddle entity.
 *
 * Wraps an ArcadePhysics sprite and exposes a clean interface.
 * All input handling lives here; the scene never reads input directly.
 *
 * Input supported:
 *   - Left/Right arrow keys
 *   - A/D keys
 *   - Mouse move (paddle follows cursor X)
 *   - Touch drag (paddle follows touch X)
 */
import { Scene, GameObjects } from 'phaser';
import { ArcadePhysics } from '@phaser/physics/arcade';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';

export class Paddle {
  private sprite: ArcadePhysics.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    left: Phaser.Input.Keyboard.Key;
    right: Phaser.Input.Keyboard.Key;
  };
  private targetX: number | null = null;
  private usingPointer: boolean = false;

  constructor(scene: Scene) {
    const { width, height } = scene.sys.game.config as {
      width: number;
      height: number;
    };

    const startX = width / 2;
    const startY = height - Balance.PADDLE_Y_OFFSET;

    this.sprite = ArcadePhysics.createSprite(scene, startX, startY, AssetKeys.PADDLE);
    this.sprite.setImmovable(true);
    this.sprite.setCollideWorldBounds(true);
    this.setWidth(Balance.PADDLE_WIDTH_NORMAL);

    // Keyboard input
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys({
      left: Phaser.Input.Keyboard.KeyCodes.A,
      right: Phaser.Input.Keyboard.KeyCodes.D,
    }) as { left: Phaser.Input.Keyboard.Key; right: Phaser.Input.Keyboard.Key };

    // Mouse / touch input — follow pointer X
    scene.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      this.targetX = pointer.x;
      this.usingPointer = true;
    });

    // When keyboard is pressed, stop following pointer so keys take over
    scene.input.keyboard!.on('keydown', () => {
      this.usingPointer = false;
      this.targetX = null;
    });
  }

  getSprite(): ArcadePhysics.Sprite {
    return this.sprite;
  }

  getX(): number {
    return this.sprite.x;
  }

  getY(): number {
    return this.sprite.y;
  }

  getWidth(): number {
    return this.sprite.displayWidth;
  }

  setWidth(width: number): void {
    this.sprite.setDisplaySize(width, Balance.PADDLE_HEIGHT);
  }

  resetToCenter(sceneWidth: number): void {
    this.sprite.setX(sceneWidth / 2);
    this.sprite.setVelocityX(0);
    this.usingPointer = false;
    this.targetX = null;
  }

  update(_delta: number): void {
    if (this.usingPointer && this.targetX !== null) {
      this.sprite.setX(this.targetX);
      this.sprite.setVelocityX(0);
    } else {
      const movingLeft =
        this.cursors.left.isDown || this.wasd.left.isDown;
      const movingRight =
        this.cursors.right.isDown || this.wasd.right.isDown;

      if (movingLeft) {
        this.sprite.setVelocityX(-Balance.PADDLE_SPEED);
      } else if (movingRight) {
        this.sprite.setVelocityX(Balance.PADDLE_SPEED);
      } else {
        this.sprite.setVelocityX(0);
      }
    }
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
```

**Notes:**
- `setImmovable(true)` means the physics engine will not push the paddle when the ball hits it. The ball bounces; the paddle does not budge.
- `setCollideWorldBounds(true)` prevents the paddle from sliding off the left/right walls using the world bounds set in Step 1.
- Pointer mode and keyboard mode are mutually exclusive. Moving the mouse activates pointer mode; pressing any keyboard key switches back to keyboard mode. This prevents jitter when both are used simultaneously.
- `setX` is used directly in pointer mode rather than setting velocity, because velocity-based movement has a one-frame lag that makes mouse tracking feel loose.
- `setWidth` uses `setDisplaySize` not `setScale` — the texture stays the same size, only the display dimensions change. This is important for when the narrow-paddle stretch goal is implemented.

---

## Step 2 — Create `src/entities/Paddle.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Paddle } from './Paddle';

// Mock the entire Phaser + ArcadePhysics surface the Paddle touches
vi.mock('phaser', () => ({
  Input: {
    Keyboard: {
      KeyCodes: { A: 65, D: 68 },
    },
  },
}));

vi.mock('@phaser/physics/arcade', () => ({
  ArcadePhysics: {
    createSprite: vi.fn(() => ({
      x: 240,
      y: 580,
      displayWidth: 100,
      displayHeight: 14,
      setImmovable: vi.fn().mockReturnThis(),
      setCollideWorldBounds: vi.fn().mockReturnThis(),
      setDisplaySize: vi.fn().mockReturnThis(),
      setVelocityX: vi.fn().mockReturnThis(),
      setX: vi.fn(function (x: number) {
        this.x = x;
        return this;
      }),
      destroy: vi.fn(),
    })),
  },
}));

function createMockScene() {
  return {
    sys: { game: { config: { width: 480, height: 640 } } },
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
```

---

## Step 3 — Update `src/scenes/GameScene.ts`

Replace the existing `GameScene.ts` with this updated version that creates the paddle and calls `paddle.update()` each frame:

```ts
/**
 * GameScene.ts — Core gameplay scene.
 *
 * Step 2 additions:
 *   - Paddle entity created and positioned
 *   - paddle.update(delta) called each frame
 */
import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';
import { Balance } from '../config/Balance';
import { Paddle } from '../entities/Paddle';

const WALL_COLOR = 0x8888ff;
const CEILING_COLOR = 0x8888ff;

export const GameScene: Scene = {
  key: SceneKeys.GAME,

  create() {
    const { width, height } = this.sys.game.config as {
      width: number;
      height: number;
    };
    const t = Balance.WALL_THICKNESS;

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

    // Paddle
    (this as unknown as { paddle: Paddle }).paddle = new Paddle(this);

    // HUD runs as a parallel scene
    this.scene.launch(SceneKeys.HUD);
  },

  update(_time: number, delta: number) {
    const self = this as unknown as { paddle: Paddle };
    self.paddle.update(delta);
  },
};
```

**Notes:**
- The `(this as unknown as { paddle: Paddle })` cast is required because Phaser 4 functional scenes are plain objects typed as `Scene` — there is no class body to add properties to. The cast is isolated to two lines and is the correct pattern for this architecture. Do not lift `paddle` into module scope as a `let` variable; that would break if the scene is ever restarted, since `let` variables persist across scene restarts but the entity would be re-created.
- The scene calls `paddle.update(delta)` and nothing else. It does not read input, set velocity, or check bounds — all of that is inside `Paddle.update()`.

---

## Step 4 — Run the tests

```bash
npm test
```

Expected: all previous tests still pass, plus the new Paddle tests. Fix any failures before continuing.

---

## Step 5 — Start the dev server and verify

```bash
npm run dev
```

Verify the following in the browser:

- A white rectangle (the paddle) is visible near the bottom of the canvas.
- Left/right arrow keys move the paddle left and right.
- A and D keys also move the paddle.
- Moving the mouse left and right makes the paddle follow the cursor.
- The paddle cannot move beyond the left or right walls.
- The paddle does not move on its own.

---

## Notes for the next agent

- The `Paddle` class is complete and ready for ball collision in Step 3. The scene exposes `paddle.getSprite()` which returns the raw `ArcadePhysics.Sprite` needed to register a collider.
- The narrow-paddle stretch goal (`setWidth(Balance.PADDLE_WIDTH_NARROW)`) is already wired — call it when `Events.BALL_CEILING_HIT` fires.
- `resetToCenter(width)` is already implemented — call it from the `Events.LIFE_LOST` handler in a later step.
- Do not add ball logic, brick logic, or scoring to this scene yet — those are Step 3 and Step 4.
- Do not use class-based scenes, `this.physics.add.*`, or monolithic `import Phaser from 'phaser'` — see AGENTS.md.
