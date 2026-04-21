# Step 3 Agent Instructions — Ball with Bouncing Physics

## Prerequisites
- Steps 1 and 2 are complete and `npm test` passes with all tests green.
- `npm run dev` shows the canvas with walls, ceiling, and a working paddle.
- Working directory: `breakout/`

---

## Overview

This step adds a `Ball` entity to `src/entities/`. The ball launches from above the paddle on Space/click/tap, bounces off the left wall, right wall, and ceiling via world bounds, and bounces off the paddle via an ArcadePhysics collider registered in `GameScene`. When the ball exits the bottom of the screen, `Events.LIFE_LOST` is emitted. The ball detects the bottom exit in its own `update()` method — the scene does not check this.

Tauri desktop mode requires no additional physics or input code. The only desktop-specific concern is audio context unlocking, which is handled in `PreloaderScene` behind a `Platform` check. All other ball behaviour is identical on both targets.

---

## Step 1 — Update `src/systems/Platform.ts`

Replace the existing file with this version that adds an `isDesktop()` helper. This is the only place in the codebase that branches on platform:

```ts
/**
 * Platform.ts — Isolates all platform-specific branching.
 * Browser: localStorage for persistence, manual audio unlock required.
 * Desktop (Tauri): file system API for persistence, audio works immediately.
 */

const HIGH_SCORE_KEY = 'breakout_high_score';

export const Platform = {
  /**
   * Returns true when running inside Tauri (desktop).
   * All platform branching in the codebase must go through this method —
   * never call isTauri() directly outside this file.
   */
  isDesktop(): boolean {
    return typeof window !== 'undefined' &&
      '__TAURI_INTERNALS__' in window;
  },

  saveHighScore(score: number): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      // Storage unavailable — silently ignore
    }
  },

  loadHighScore(): number {
    try {
      const raw = localStorage.getItem(HIGH_SCORE_KEY);
      if (raw === null) {
        return 0;
      }
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  },
};
```

**Notes:**
- `__TAURI_INTERNALS__` is injected into `window` by Tauri 2.0 at runtime. Checking for it is the correct synchronous way to detect desktop without importing `@tauri-apps/api`, which is an async call and unsuitable for use during scene setup.
- Do not scatter this check anywhere else. Every platform branch in the entire codebase goes through `Platform.isDesktop()`.

---

## Step 2 — Update `src/systems/Platform.test.ts`

Create this new test file:

```ts
import { describe, it, expect, vi } from 'vitest';
import { Platform } from './Platform';

describe('Platform', () => {
  it('isDesktop() returns false when __TAURI_INTERNALS__ is absent', () => {
    expect(Platform.isDesktop()).toBe(false);
  });

  it('isDesktop() returns true when __TAURI_INTERNALS__ is present', () => {
    (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] = {};
    expect(Platform.isDesktop()).toBe(true);
    delete (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'];
  });

  it('loadHighScore() returns 0 when nothing is stored', () => {
    expect(Platform.loadHighScore()).toBe(0);
  });

  it('saveHighScore() and loadHighScore() round-trip correctly', () => {
    Platform.saveHighScore(9999);
    expect(Platform.loadHighScore()).toBe(9999);
  });

  it('loadHighScore() returns 0 for non-numeric stored value', () => {
    localStorage.setItem('breakout_high_score', 'garbage');
    expect(Platform.loadHighScore()).toBe(0);
  });
});
```

---

## Step 3 — Update `src/scenes/PreloaderScene.ts`

Replace the existing file. The only addition is audio context unlocking, which is gated behind `Platform.isDesktop()` — desktop skips it because Tauri does not require a user gesture before audio plays:

```ts
/**
 * PreloaderScene.ts — Generates all game textures programmatically.
 * Also handles audio context unlocking for browser targets.
 */
import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';
import { Platform } from '../systems/Platform';

export const PreloaderScene: Scene = {
  key: SceneKeys.PRELOADER,

  preload() {},

  create() {
    generateBallTexture(this);
    generatePaddleTexture(this);
    generateBrickTexture(this);

    if (Platform.isDesktop()) {
      // Tauri: audio context is available immediately — proceed straight away
      this.scene.start(SceneKeys.GAME);
    } else {
      // Browser: audio context requires a user gesture before it unlocks.
      // Listen for Phaser's built-in unlock event and transition then.
      // If audio is already unlocked (e.g. user clicked before preload finished),
      // the event will never fire — so also start immediately in that case.
      const audioManager = this.sound as unknown as {
        locked: boolean;
        once: (event: string, cb: () => void) => void;
      };

      if (!audioManager.locked) {
        this.scene.start(SceneKeys.GAME);
      } else {
        audioManager.once('unlocked', () => {
          this.scene.start(SceneKeys.GAME);
        });
      }
    }
  },
};

function generateBallTexture(scene: Scene): void {
  const size = Balance.BALL_SIZE;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, size, size);
  g.generateTexture(AssetKeys.BALL, size, size);
  g.destroy();
}

function generatePaddleTexture(scene: Scene): void {
  const w = Balance.PADDLE_WIDTH_NORMAL;
  const h = Balance.PADDLE_HEIGHT;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, w, h);
  g.generateTexture(AssetKeys.PADDLE, w, h);
  g.destroy();
}

function generateBrickTexture(scene: Scene): void {
  const w = Balance.BRICK_WIDTH;
  const h = Balance.BRICK_HEIGHT;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x000000, 0.25);
  g.fillRect(w - 2, 0, 2, h);
  g.fillRect(0, h - 2, w, 2);
  g.generateTexture(AssetKeys.BRICK, w, h);
  g.destroy();
}
```

---

## Step 4 — Create `src/entities/Ball.ts`

```ts
/**
 * Ball.ts — The game ball entity.
 *
 * Responsibilities:
 *   - Wraps an ArcadePhysics sprite with bounce=1 and world bounds collide
 *   - Tracks whether it is "live" (in flight) or "waiting" (sitting on paddle)
 *   - Launches on Space key, left mouse click, or tap
 *   - Detects exit through the bottom of the screen and emits LIFE_LOST
 *   - Detects first ceiling contact per life and emits BALL_CEILING_HIT
 *   - Exposes incrementSpeed() for GameState to call after BRICK_DESTROYED
 *
 * What Ball does NOT do:
 *   - Does not update score, lives, or speed values directly
 *   - Does not register its own collider with the paddle or bricks —
 *     the scene owns collider registration (see AGENTS.md architecture notes)
 */
import { Scene } from 'phaser';
import { ArcadePhysics } from '@phaser/physics/arcade';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';

/** Minimum launch angle offset from vertical, in degrees. */
const LAUNCH_ANGLE_VARIANCE = 30;

export class Ball {
  private sprite: ArcadePhysics.Sprite;
  private isLive: boolean = false;
  private hasHitCeiling: boolean = false;
  private launchKey!: Phaser.Input.Keyboard.Key;
  private sceneWidth: number;
  private sceneHeight: number;

  constructor(scene: Scene, paddleX: number, paddleY: number) {
    const { width, height } = scene.sys.game.config as {
      width: number;
      height: number;
    };
    this.sceneWidth = width as number;
    this.sceneHeight = height as number;

    this.sprite = ArcadePhysics.createSprite(
      scene,
      paddleX,
      paddleY - Balance.PADDLE_HEIGHT / 2 - Balance.BALL_SIZE / 2 - 1,
      AssetKeys.BALL,
    );

    this.sprite.setBounce(1, 1);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDisplaySize(Balance.BALL_SIZE, Balance.BALL_SIZE);

    // Space bar to launch
    this.launchKey = scene.input.keyboard!.addKey(
      Phaser.Input.Keyboard.KeyCodes.SPACE,
    );

    // Mouse / tap to launch
    scene.input.on(
      'pointerdown',
      () => {
        if (!this.isLive) {
          this.launch();
        }
      },
    );
  }

  getSprite(): ArcadePhysics.Sprite {
    return this.sprite;
  }

  getIsLive(): boolean {
    return this.isLive;
  }

  /**
   * Called by GameState (via EventBus) after a brick is destroyed.
   * Reads the current authoritative speed from GameState and applies it
   * to the ball's velocity while preserving direction.
   */
  incrementSpeed(): void {
    const speed = gameState.getBallSpeed();
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    const vx = body.velocity.x;
    const vy = body.velocity.y;
    const currentSpeed = Math.sqrt(vx * vx + vy * vy);

    if (currentSpeed === 0) {
      return;
    }

    const scale = speed / currentSpeed;
    this.sprite.setVelocity(vx * scale, vy * scale);
  }

  /**
   * Resets the ball to sitting just above the paddle.
   * Called after a life is lost (but lives remain).
   */
  resetToPaddle(paddleX: number, paddleY: number): void {
    this.isLive = false;
    this.hasHitCeiling = false;
    this.sprite.setVelocity(0, 0);
    this.sprite.setX(paddleX);
    this.sprite.setY(
      paddleY - Balance.PADDLE_HEIGHT / 2 - Balance.BALL_SIZE / 2 - 1,
    );
  }

  update(_delta: number): void {
    if (!this.isLive) {
      // Space to launch
      if (Phaser.Input.Keyboard.JustDown(this.launchKey)) {
        this.launch();
      }
      return;
    }

    // Ceiling detection — emit once per life
    const body = this.sprite.body as Phaser.Physics.Arcade.Body;
    if (!this.hasHitCeiling && body.blocked.up) {
      this.hasHitCeiling = true;
      EventBus.emit(Events.BALL_CEILING_HIT);
    }

    // Bottom exit detection — ball has left the screen
    if (this.sprite.y > this.sceneHeight + Balance.BALL_SIZE) {
      this.isLive = false;
      EventBus.emit(Events.LIFE_LOST);
    }
  }

  private launch(): void {
    this.isLive = true;
    this.hasHitCeiling = false;

    // Randomise launch angle slightly left or right of vertical
    // to prevent perfectly vertical shots that never reach the sides
    const variance =
      (Math.random() * LAUNCH_ANGLE_VARIANCE * 2) - LAUNCH_ANGLE_VARIANCE;
    const angleRad = ((-90 + variance) * Math.PI) / 180;
    const speed = gameState.getBallSpeed();

    this.sprite.setVelocity(
      Math.cos(angleRad) * speed,
      Math.sin(angleRad) * speed,
    );
  }

  destroy(): void {
    this.sprite.destroy();
  }
}
```

**Notes:**
- `setBounce(1, 1)` gives a perfectly elastic bounce — no energy is lost on any surface. This is correct for Breakout.
- `setCollideWorldBounds(true)` makes the ball bounce off the left, right, and ceiling bounds set in Step 1. The bottom bound is open, so the ball passes through.
- The launch angle is randomised within ±30° of straight up. Without this, a perfectly vertical ball never reaches the side walls and the game becomes unplayable.
- `incrementSpeed()` preserves direction by normalising the current velocity vector and rescaling it to the new speed. It does not add to the current speed directly — it sets the speed to whatever `GameState.getBallSpeed()` currently holds, which is the authoritative value.
- Ceiling detection uses `body.blocked.up` rather than a Y position check, because `blocked.up` is set by the physics engine exactly when the world bounds ceiling is contacted. This is more reliable than a raw Y threshold.
- Bottom exit detection uses `sprite.y > sceneHeight + BALL_SIZE` rather than `sprite.y > sceneHeight`, adding one ball-size of padding so the ball is fully off-screen before the life is lost. This prevents a jarring instant-cut when the ball just grazes the bottom edge.
- The ball does **not** register its own collider with the paddle. Collider registration is the scene's responsibility per AGENTS.md.

---

## Step 5 — Create `src/entities/Ball.test.ts`

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { Ball } from './Ball';

vi.mock('phaser', () => ({
  Input: {
    Keyboard: {
      KeyCodes: { SPACE: 32 },
      JustDown: vi.fn(() => false),
    },
  },
}));

vi.mock('@phaser/physics/arcade', () => ({
  ArcadePhysics: {
    createSprite: vi.fn(() => ({
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
    })),
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

function createMockScene() {
  return {
    sys: { game: { config: { width: 480, height: 640 } } },
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
```

---

## Step 6 — Update `src/scenes/GameScene.ts`

Replace the existing file with this version that adds the ball, wires the paddle collider, and handles the `LIFE_LOST` and `GAME_OVER` events:

```ts
/**
 * GameScene.ts — Core gameplay scene.
 *
 * Step 3 additions:
 *   - Ball entity created above the paddle
 *   - ArcadePhysics collider registered between ball and paddle
 *   - LIFE_LOST handler resets ball and paddle
 *   - GAME_OVER handler transitions to GameOverScene (stubbed)
 *   - ball.update(delta) called each frame
 */
import { Scene } from 'phaser';
import { ArcadePhysics } from '@phaser/physics/arcade';
import { SceneKeys } from '../config/SceneKeys';
import { Balance } from '../config/Balance';
import { Paddle } from '../entities/Paddle';
import { Ball } from '../entities/Ball';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';

const WALL_COLOR = 0x8888ff;
const CEILING_COLOR = 0x8888ff;

// Internal state shape carried on the scene object
interface GameSceneState {
  paddle: Paddle;
  ball: Ball;
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

    // Paddle ↔ Ball collider
    // Callback does minimum work: bounce angle influence is handled inside
    // the physics response automatically via world bounds + bounce=1.
    // A custom angle deflection based on hit position is applied here.
    ArcadePhysics.addCollider(
      this,
      self.ball.getSprite(),
      self.paddle.getSprite(),
      () => {
        onBallHitPaddle(self.ball, self.paddle);
      },
    );

    // Life lost — reset ball and paddle, update HUD
    EventBus.on(Events.LIFE_LOST, () => {
      if (gameState.getLives() > 0) {
        self.paddle.resetToCenter(width);
        self.ball.resetToPaddle(self.paddle.getX(), self.paddle.getY());
      }
    });

    // Game over — transition scene
    EventBus.on(Events.GAME_OVER, () => {
      // GameOverScene is not yet built — restart game for now
      this.scene.restart();
    });

    // Clean up EventBus listeners when this scene shuts down
    this.events.on('shutdown', () => {
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
// Collision handler — minimum work only (see AGENTS.md collision guidelines)
// ---------------------------------------------------------------------------

/**
 * Applies paddle-angle influence: the ball's horizontal velocity is biased
 * by how far from centre it struck the paddle. Hitting the left edge sends
 * it further left; hitting the right edge sends it further right.
 * Vertical speed magnitude is preserved.
 */
function onBallHitPaddle(ball: Ball, paddle: Paddle): void {
  const ballX = ball.getSprite().x;
  const paddleX = paddle.getX();
  const halfWidth = paddle.getWidth() / 2;

  // Normalised hit position: -1 (far left) to +1 (far right)
  const hitPos = Math.max(-1, Math.min(1, (ballX - paddleX) / halfWidth));

  const speed = gameState.getBallSpeed();
  const maxAngleRad = (70 * Math.PI) / 180; // max 70° from vertical
  const angle = hitPos * maxAngleRad;

  ball.getSprite().setVelocity(
    Math.sin(angle) * speed,
    -Math.abs(Math.cos(angle) * speed), // always send upward
  );
}
```

**Notes:**
- `ArcadePhysics.addCollider(scene, a, b, callback)` is the Phaser 4 pattern. Do not use `this.physics.add.collider`.
- The `GAME_OVER` handler calls `this.scene.restart()` as a temporary stub. This will be replaced with a proper `GameOverScene` transition in a later step.
- `EventBus.off` is called in the scene's `shutdown` event to prevent listener accumulation if the scene restarts. Without this, each restart adds a new set of listeners on top of the old ones.
- `gameState.reset()` is called at the top of `create()` so that score, lives, and ball speed are clean on every scene start or restart.
- The paddle angle influence is implemented in `onBallHitPaddle` — this is a plain function outside the scene object, not a method. The callback passed to `addCollider` is a one-liner that delegates to it, keeping the collider registration readable.

---

## Step 7 — Run the tests

```bash
npm test
```

Expected: all previous tests still pass plus the new Ball and Platform tests. Fix any failures before continuing.

---

## Step 8 — Browser verification (`npm run dev`)

```bash
npm run dev
```

Verify the following:

- A white square (the ball) sits just above the paddle on load.
- Pressing Space or clicking/tapping launches the ball upward at a slight angle.
- The ball bounces off the left wall, right wall, and ceiling.
- The ball bounces off the paddle.
- Hitting the left edge of the paddle deflects the ball to the left; hitting the right edge deflects it to the right; hitting centre returns it more vertically.
- When the ball exits the bottom of the screen, it resets to above the paddle and the game can be relaunched with Space or click.

---

## Step 9 — Desktop verification (`npm run tauri:dev`)

```bash
npm run tauri:dev
```

Verify the same checklist as Step 8. Additionally confirm:

- The game launches without a blank/silent audio stall. On desktop, `PreloaderScene` skips the audio unlock wait and transitions to `GameScene` immediately.
- Keyboard and mouse input both work inside the Tauri window.
- The window does not resize unexpectedly. Canvas dimensions are fixed at `Balance.CANVAS_WIDTH` × `Balance.CANVAS_HEIGHT`.

> **Note:** `tauri:dev` requires Rust to be installed (`rustup` + stable toolchain). If Rust is not set up, skip this step and verify in the browser only. The game logic is identical on both targets.

---

## Notes for the next agent

- The ball, paddle, and collision are fully wired. The next step adds bricks.
- Brick collision will follow the same `ArcadePhysics.addCollider` pattern used here for the paddle. Register it in `GameScene.create()` alongside the paddle collider.
- The `onBallHitBrick` callback must do **minimum work only**: call `brick.destroy()` and `EventBus.emit(Events.BRICK_DESTROYED, { rowIndex })`. Do not update score, speed, or UI inside the callback — that is `GameState`'s job via the EventBus.
- `EventBus.off(Events.LIFE_LOST)` in the shutdown handler currently removes **all** listeners for that event. When more listeners are added in later steps (e.g. HUD updating the lives counter), switch to `EventBus.off(Events.LIFE_LOST, specificHandler)` using named handler references to avoid accidentally removing unrelated listeners.
- Do not add a bottom wall to the world bounds. The open bottom is intentional and load-bearing for the life-loss detection in `Ball.update()`.
- Do not use class-based scenes, `this.physics.add.*`, or `import Phaser from 'phaser'`. See AGENTS.md.
