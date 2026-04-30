# Step 5 Agent Instructions — High Score Persistence & Display

## Prerequisites
- Steps 1–4 are complete and `npm test` passes with all tests green.
- `npm run dev` shows bricks spawning, ball bouncing, bricks being destroyed.
- Working directory: `breakout/`

---

## Overview

This step wires high score persistence end-to-end. On browser, the high score is saved to `localStorage`. On desktop (Tauri), it is saved to a file via the Tauri file system API, which persists across app reinstalls and is the correct pattern for a Steam release. The `Platform.ts` system already has the browser side from Step 3 — this step adds the Tauri branch and wires both into `GameState`. The HUD is updated to display the high score alongside score and lives at all times. `GameOverScene` is added as a real scene so the game has a complete loop.

All platform branching stays in `Platform.ts`. No other file calls `isTauri()` or touches `localStorage` directly.

---

## Step 1 — Add Tauri file system dependency

Run this only if targeting desktop. Skip if Rust/Tauri is not set up:

```bash
npm install @tauri-apps/api
npm install @tauri-apps/plugin-fs
```

Then open `src-tauri/tauri.conf.json` and add `"fs"` to the plugin list if it is not already present:

```json
{
  "plugins": {
    "fs": {
      "scope": ["$APPDATA/*"]
    }
  }
}
```

Also add the plugin to `src-tauri/Cargo.toml` under `[dependencies]` if not present:

```toml
tauri-plugin-fs = "2"
```

And register it in `src-tauri/src/main.rs`:

```rust
fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_fs::init())
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

> **Note:** it is confirmed that Rust is installed
---

## Step 2 — Replace `src/systems/Platform.ts`

Replace the existing file entirely. This version adds the Tauri file system branch alongside the existing browser branch:

```ts
/**
 * Platform.ts — Isolates all platform-specific branching.
 *
 * Browser:  localStorage for high score persistence.
 * Desktop:  Tauri file system plugin writes a JSON file to $APPDATA.
 *
 * All callers use saveHighScore() and loadHighScore() — they never know
 * which branch ran. No other file in the codebase imports from
 * @tauri-apps/api or touches localStorage directly.
 */

const HIGH_SCORE_KEY = 'breakout_high_score';
const HIGH_SCORE_FILENAME = 'highscore.json';

export const Platform = {
  /**
   * Returns true when running inside Tauri (desktop).
   * Uses a synchronous window property check — safe to call anywhere,
   * including during scene setup before any async operations.
   */
  isDesktop(): boolean {
    return (
      typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window
    );
  },

  /**
   * Persists the high score for the current platform.
   * Fire-and-forget — callers do not await this.
   */
  async saveHighScore(score: number): Promise<void> {
    if (Platform.isDesktop()) {
      await Platform._saveTauri(score);
    } else {
      Platform._saveBrowser(score);
    }
  },

  /**
   * Loads the persisted high score for the current platform.
   * Returns 0 if nothing is stored or if any error occurs.
   */
  async loadHighScore(): Promise<number> {
    if (Platform.isDesktop()) {
      return Platform._loadTauri();
    } else {
      return Platform._loadBrowser();
    }
  },

  // ------------------------------------------------------------------
  // Browser branch
  // ------------------------------------------------------------------

  _saveBrowser(score: number): void {
    try {
      localStorage.setItem(HIGH_SCORE_KEY, String(score));
    } catch {
      // Storage unavailable — silently ignore
    }
  },

  _loadBrowser(): number {
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

  // ------------------------------------------------------------------
  // Tauri branch
  // ------------------------------------------------------------------

  async _saveTauri(score: number): Promise<void> {
    try {
      const { writeTextFile, BaseDirectory } = await import(
        '@tauri-apps/plugin-fs'
      );
      await writeTextFile(
        HIGH_SCORE_FILENAME,
        JSON.stringify({ score }),
        { baseDir: BaseDirectory.AppData },
      );
    } catch {
      // File write failed — silently ignore
    }
  },

  async _loadTauri(): Promise<number> {
    try {
      const { readTextFile, BaseDirectory, exists } = await import(
        '@tauri-apps/plugin-fs'
      );
      const fileExists = await exists(HIGH_SCORE_FILENAME, {
        baseDir: BaseDirectory.AppData,
      });
      if (!fileExists) {
        return 0;
      }
      const raw = await readTextFile(HIGH_SCORE_FILENAME, {
        baseDir: BaseDirectory.AppData,
      });
      const parsed = JSON.parse(raw) as { score?: unknown };
      const score = Number(parsed.score);
      return isNaN(score) ? 0 : score;
    } catch {
      return 0;
    }
  },
};
```

**Notes:**
- The Tauri imports are inside the async functions (`await import(...)`), not at the top of the file. This is intentional — if the Tauri plugin is not installed, the browser build will never reach those branches and the dynamic import will never execute. A top-level import would cause the browser bundle to fail.
- `BaseDirectory.AppData` maps to `%APPDATA%` on Windows, `~/Library/Application Support` on macOS, and `~/.local/share` on Linux. This is the correct location for a Steam game's save data.
- `saveHighScore` is now `async`. Callers in `GameState` fire-and-forget with no `await` — the save is best-effort. The game never blocks on a save completing.
- Both `_saveTauri` and `_saveBrowser` methods are prefixed with `_` to signal they are internal. Tests should call the public `saveHighScore` / `loadHighScore` methods, not these directly.

---

## Step 3 — Replace `src/systems/Platform.test.ts`

```ts
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { Platform } from './Platform';

describe('Platform.isDesktop()', () => {
  it('returns false when __TAURI_INTERNALS__ is absent', () => {
    expect(Platform.isDesktop()).toBe(false);
  });

  it('returns true when __TAURI_INTERNALS__ is present', () => {
    (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'] = {};
    expect(Platform.isDesktop()).toBe(true);
    delete (window as unknown as Record<string, unknown>)['__TAURI_INTERNALS__'];
  });
});

describe('Platform browser persistence', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
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
```

---

## Step 4 — Replace `src/systems/GameState.ts`

`saveHighScore` and `loadHighScore` are now async. `GameState` fires the save as a best-effort side effect and exposes an async `init()` method that `GameScene` calls once on startup to hydrate the persisted high score before the first frame renders:

```ts
/**
 * GameState.ts — Authoritative source for score, lives, ball speed,
 * and high score.
 *
 * High score is loaded from Platform on init() and saved to Platform
 * whenever it is beaten. All other mutations emit EventBus events.
 */
import { EventBus } from './EventBus';
import { Events } from '../config/Events';
import { Balance } from '../config/Balance';
import { Platform } from './Platform';

export class GameState {
  private score: number = 0;
  private lives: number = Balance.LIVES_START;
  private ballSpeed: number = Balance.BALL_SPEED_INITIAL;
  private highScore: number = 0;

  /**
   * Loads the persisted high score from Platform.
   * Must be called once at game startup before the first scene renders.
   * GameScene.create() awaits this via a one-time async prelude.
   */
  async init(): Promise<void> {
    this.highScore = await Platform.loadHighScore();
  }

  /**
   * Resets per-session state. Does NOT reset high score —
   * high score persists across sessions and is only updated on game over.
   */
  reset(): void {
    this.score = 0;
    this.lives = Balance.LIVES_START;
    this.ballSpeed = Balance.BALL_SPEED_INITIAL;
  }

  getScore(): number { return this.score; }
  getLives(): number { return this.lives; }
  getBallSpeed(): number { return this.ballSpeed; }
  getHighScore(): number { return this.highScore; }

  onBrickDestroyed(rowIndex: number): void {
    const points = Balance.ROW_SCORES[rowIndex] ?? Balance.BRICK_SCORE_DEFAULT;
    this.score += points;

    if (this.ballSpeed < Balance.BALL_SPEED_MAX) {
      this.ballSpeed = Math.min(
        this.ballSpeed + Balance.BALL_SPEED_INCREMENT,
        Balance.BALL_SPEED_MAX,
      );
    }

    EventBus.emit(Events.SCORE_CHANGED, { score: this.score, highScore: this.highScore });
  }

  onLifeLost(): void {
    this.lives -= 1;

    if (this.lives <= 0) {
      this.lives = 0;
      this.updateHighScore();
      EventBus.emit(Events.GAME_OVER, { score: this.score, highScore: this.highScore });
    }
  }

  private updateHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      // Fire-and-forget — do not await, do not block game logic
      Platform.saveHighScore(this.highScore).catch(() => {
        // Save failed silently — high score is still correct in memory
      });
    }
  }
}

export const gameState = new GameState();
```

---

## Step 5 — Replace `src/systems/GameState.test.ts`

Update the test file to cover the new `init()` method and the high score update behaviour:

```ts
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
```

---

## Step 6 — Replace `src/scenes/HudScene.ts`

Update the HUD to display the high score alongside score and lives. The layout matches GAME_DESIGN.md: `SCORE: 0000   LIVES: ❤❤❤   HI: 0000`:

```ts
/**
 * HudScene.ts — Parallel overlay scene showing score, lives, high score.
 *
 * Listens to EventBus events from GameState. Never reads game state
 * directly — all values arrive via event payloads.
 */
import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';
import { Balance } from '../config/Balance';

const TEXT_STYLE = {
  fontSize: '14px',
  color: '#ffffff',
  fontFamily: 'monospace',
};

const HUD_Y = 20;

export const HudScene: Scene = {
  key: SceneKeys.HUD,

  create() {
    const { width } = this.sys.game.config as { width: number };

    const scoreText = this.add
      .text(Balance.WALL_THICKNESS + 8, HUD_Y, formatScore(0), TEXT_STYLE)
      .setOrigin(0, 0.5)
      .setDepth(10);

    const livesText = this.add
      .text(width / 2, HUD_Y, formatLives(Balance.LIVES_START), TEXT_STYLE)
      .setOrigin(0.5, 0.5)
      .setDepth(10);

    const hiText = this.add
      .text(
        width - Balance.WALL_THICKNESS - 8,
        HUD_Y,
        formatHiScore(gameState.getHighScore()),
        TEXT_STYLE,
      )
      .setOrigin(1, 0.5)
      .setDepth(10);

    // Score changed — update score and hi score display
    const onScoreChanged = ({
      score,
      highScore,
    }: {
      score: number;
      highScore: number;
    }) => {
      scoreText.setText(formatScore(score));
      hiText.setText(formatHiScore(highScore));
    };

    // Life lost — update lives display
    const onLifeLost = () => {
      livesText.setText(formatLives(gameState.getLives()));
    };

    // Game over — ensure hi score is up to date in the display
    const onGameOver = ({ highScore }: { highScore: number }) => {
      hiText.setText(formatHiScore(highScore));
    };

    EventBus.on(Events.SCORE_CHANGED, onScoreChanged);
    EventBus.on(Events.LIFE_LOST, onLifeLost);
    EventBus.on(Events.GAME_OVER, onGameOver);

    // Remove named listeners on shutdown to prevent accumulation
    this.events.on('shutdown', () => {
      EventBus.off(Events.SCORE_CHANGED, onScoreChanged);
      EventBus.off(Events.LIFE_LOST, onLifeLost);
      EventBus.off(Events.GAME_OVER, onGameOver);
    });
  },
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatScore(score: number): string {
  return `SCORE: ${String(score).padStart(4, '0')}`;
}

function formatLives(lives: number): string {
  return `LIVES: ${'❤'.repeat(Math.max(0, lives))}`;
}

function formatHiScore(hi: number): string {
  return `HI: ${String(hi).padStart(4, '0')}`;
}
```

**Notes:**
- Listeners are now named functions (`onScoreChanged`, `onLifeLost`, `onGameOver`) so the `shutdown` handler can remove them specifically with `EventBus.off(event, handler)`. This replaces the event-name-only `EventBus.off` pattern from earlier steps and prevents listener accumulation across scene restarts.
- The HUD reads `gameState.getHighScore()` once on `create()` to populate the initial `HI:` display from the value loaded during `init()`. After that it only updates via events.
- `setDepth(10)` ensures HUD text renders above all game objects. Phaser 4 renders objects in depth order.

---

## Step 7 — Add `GameOverScene` to `src/scenes/GameOverScene.ts`

Create this new file. It replaces the `scene.restart()` stub used in previous steps:

```ts
/**
 * GameOverScene.ts — Shown when lives reach zero.
 * Displays final score and high score, prompts restart.
 */
import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';
import { gameState } from '../systems/GameState';

const TEXT_STYLE_LARGE = {
  fontSize: '32px',
  color: '#ffffff',
  fontFamily: 'monospace',
};

const TEXT_STYLE_SMALL = {
  fontSize: '16px',
  color: '#aaaaaa',
  fontFamily: 'monospace',
};

export const GameOverScene: Scene = {
  key: SceneKeys.GAME_OVER,

  create() {
    const { width, height } = this.sys.game.config as {
      width: number;
      height: number;
    };

    const cx = (width as number) / 2;

    this.add
      .text(cx, (height as number) * 0.35, 'GAME OVER', TEXT_STYLE_LARGE)
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        (height as number) * 0.48,
        `SCORE: ${String(gameState.getScore()).padStart(4, '0')}`,
        TEXT_STYLE_SMALL,
      )
      .setOrigin(0.5);

    this.add
      .text(
        cx,
        (height as number) * 0.55,
        `BEST:  ${String(gameState.getHighScore()).padStart(4, '0')}`,
        TEXT_STYLE_SMALL,
      )
      .setOrigin(0.5);

    const prompt = this.add
      .text(cx, (height as number) * 0.68, 'PRESS SPACE OR CLICK TO PLAY AGAIN', {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // Blink the prompt
    this.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        prompt.setVisible(!prompt.visible);
      },
    });

    // Restart on Space
    this.input.keyboard!.once('keydown-SPACE', () => {
      this.scene.stop(SceneKeys.HUD);
      this.scene.start(SceneKeys.GAME);
    });

    // Restart on click or tap
    this.input.once('pointerdown', () => {
      this.scene.stop(SceneKeys.HUD);
      this.scene.start(SceneKeys.GAME);
    });
  },
};
```

---

## Step 8 — Update `src/scenes/GameScene.ts`

Two changes only — replace the `GAME_OVER` stub with a real scene transition, and add the `gameState.init()` async prelude:

Find and replace the `create()` function in `GameScene.ts`. The diff is:

1. Add `gameState.init()` call at the top of `create()` via a self-executing async wrapper.
2. Replace `this.scene.restart()` in the `GAME_OVER` handler with a proper transition.

Replace the entire `GameScene.ts` with:

```ts
/**
 * GameScene.ts — Core gameplay scene.
 *
 * Step 5 additions:
 *   - gameState.init() called on first create to load persisted high score
 *   - GAME_OVER handler now transitions to GameOverScene
 */
import { Scene, GameObjects } from 'phaser';
import { ArcadePhysics } from '@phaser/physics/arcade';
import { SceneKeys } from '../config/SceneKeys';
import { Balance } from '../config/Balance';
import { Paddle } from '../entities/Paddle';
import { Ball } from '../entities/Ball';
import { BrickGrid, BRICK_ROW_DATA_KEY } from '../entities/BrickGrid';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';

const WALL_COLOR = 0x8888ff;
const CEILING_COLOR = 0x8888ff;

interface GameSceneState {
  paddle: Paddle;
  ball: Ball;
  brickGrid: BrickGrid;
  initialised: boolean;
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

    // Load persisted high score before first render, then finish setup.
    // On subsequent restarts init() is a fast no-op since the singleton
    // gameState retains the high score in memory.
    gameState.reset();

    const finishCreate = () => {
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
        () => { onBallHitPaddle(self.ball, self.paddle); },
      );

      // Ball ↔ Brick collider
      ArcadePhysics.addCollider(
        this,
        self.ball.getSprite(),
        self.brickGrid.getGroup(),
        (_ball: GameObjects.GameObject, brick: GameObjects.GameObject) => {
          onBallHitBrick(brick, self.brickGrid);
        },
      );

      // EventBus listeners — named so shutdown can remove them precisely
      const onBrickDestroyed = ({ rowIndex }: { rowIndex: number }) => {
        gameState.onBrickDestroyed(rowIndex);
        self.ball.incrementSpeed();
      };

      const onLifeLost = () => {
        gameState.onLifeLost();
        if (gameState.getLives() > 0) {
          self.paddle.resetToCenter(width);
          self.ball.resetToPaddle(self.paddle.getX(), self.paddle.getY());
        }
      };

      const onGameOver = () => {
        self.brickGrid.destroy();
        this.scene.stop(SceneKeys.HUD);
        this.scene.start(SceneKeys.GAME_OVER);
      };

      EventBus.on(Events.BRICK_DESTROYED, onBrickDestroyed);
      EventBus.on(Events.LIFE_LOST, onLifeLost);
      EventBus.on(Events.GAME_OVER, onGameOver);

      this.events.on('shutdown', () => {
        EventBus.off(Events.BRICK_DESTROYED, onBrickDestroyed);
        EventBus.off(Events.LIFE_LOST, onLifeLost);
        EventBus.off(Events.GAME_OVER, onGameOver);
      });

      this.scene.launch(SceneKeys.HUD);
    };

    // Only load from Platform on the very first create.
    // After that the singleton retains the high score in memory.
    if (!self.initialised) {
      self.initialised = true;
      gameState.init().then(finishCreate);
    } else {
      finishCreate();
    }
  },

  update(_time: number, delta: number) {
    const self = this as unknown as GameSceneState;
    if (self.paddle) {
      self.paddle.update(delta);
    }
    if (self.ball) {
      self.ball.update(delta);
    }
  },
};

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
- `gameState.init()` is called once only, guarded by `self.initialised`. On every subsequent scene restart (from `GameOverScene`), `finishCreate` runs synchronously and `init()` is skipped — the high score is already in memory.
- The `update()` guard (`if (self.paddle)`) prevents a one-frame crash on the first tick before `gameState.init()` resolves and `finishCreate` has run.
- All three EventBus listeners are now named functions inside `finishCreate`, so the `shutdown` handler removes them precisely instead of nuking all listeners for an event name.

---

## Step 9 — Register `GameOverScene` in `src/main.ts`

Replace `src/main.ts`:

```ts
import { Game, AUTO } from 'phaser';
import { PreloaderScene } from './scenes/PreloaderScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { GameOverScene } from './scenes/GameOverScene';
import { Balance } from './config/Balance';

new Game({
  type: AUTO,
  width: Balance.CANVAS_WIDTH,
  height: Balance.CANVAS_HEIGHT,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [PreloaderScene, GameScene, HudScene, GameOverScene],
});
```

---

## Step 10 — Run the tests

```bash
npm test
```

Expected: all previous tests still pass plus the updated `GameState` and `Platform` tests. Fix any failures before continuing.

---

## Step 11 — Browser verification (`npm run dev`)

```bash
npm run dev
```

Verify the following:

- The HUD shows `SCORE: 0000` on the left, `LIVES: ❤❤❤` in the centre, and `HI: 0000` on the right.
- Breaking bricks increments the score in real time.
- Losing all lives transitions to the `GameOverScene` which shows the final score and best score.
- Pressing Space or clicking on `GameOverScene` returns to `GameScene` and the HUD resets.
- Play a game, note the score. Refresh the page. The `HI:` value in the HUD should show the previous session's best score on load.
- If the new score beats the old high score, `HI:` updates to the new value on game over.

---

## Step 12 — Desktop verification (`npm run tauri:dev`)

```bash
npm run tauri:dev
```

Verify the same checklist as Step 11. Additionally:

- Close the Tauri window completely. Reopen with `npm run tauri:dev`. The `HI:` score from the previous session should be restored.
- Confirm the save file exists at the correct platform path:
  - **Windows:** `%APPDATA%\com.breakout.app\highscore.json`
  - **macOS:** `~/Library/Application Support/com.breakout.app/highscore.json`
  - **Linux:** `~/.local/share/com.breakout.app/highscore.json`
- Open the file and confirm it contains valid JSON: `{"score": 1234}`.
- Manually edit the file to a very high number, reopen the app, and confirm the HUD loads that value as the high score.

> **Note:** `tauri:dev` requires Rust and the `tauri-plugin-fs` dependency from Step 1. If Rust is not set up, the browser `localStorage` path is used automatically and this desktop verification step can be skipped. Rust is installed in this instance thoughbeit.

---

## Notes for the next agent

- `GameOverScene` is now a real scene but has no transition animation. A fade or delay can be added to `GameOverScene.create()` using `this.cameras.main.fadeIn()` without touching any other file.
- `Events.LEVEL_CLEAR` is still emitted but has no handler beyond the `GameOverScene` restart stub. A dedicated `LevelClearScene` should be added following the same pattern as `GameOverScene`.
- The `HUD` scene is stopped explicitly (`this.scene.stop(SceneKeys.HUD)`) before transitioning to `GameOverScene`. If it is not stopped, the HUD text will render over the game over screen. Ensure any new scenes that replace `GameScene` also stop `HUD` first.
- `EventBus.off(event, namedHandler)` is now used everywhere in this step. All future listeners added anywhere in the codebase must follow this pattern — never add a listener without a corresponding named removal in a `shutdown` or cleanup handler.
- Do not use class-based scenes, `this.physics.add.*`, or `import Phaser from 'phaser'`. See AGENTS.md.
