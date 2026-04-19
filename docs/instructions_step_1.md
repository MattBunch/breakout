# Step 1 Agent Instructions — Breakout Project Scaffold

## Prerequisites
- Node.js installed
- Working directory: wherever you want the project to live

---

## Step 1 — Create the directory structure

```bash
mkdir -p breakout/src/{scenes,entities,systems,ui,config,test/mocks} breakout/public
cd breakout
```

---

## Step 2 — Create `package.json`

Create file at `package.json`:

```json
{
  "name": "breakout",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:coverage": "vitest run --coverage"
  },
  "dependencies": {
    "phaser": "^4.0.0"
  },
  "devDependencies": {
    "typescript": "^5.4.5",
    "vite": "^5.2.0",
    "vitest": "^1.5.0",
    "@vitest/coverage-v8": "^1.5.0"
  }
}
```

---

## Step 3 — Create `tsconfig.json`

Create file at `tsconfig.json`:

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noImplicitAny": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noFallthroughCasesInSwitch": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "outDir": "dist",
    "rootDir": "src",
    "types": ["vitest/globals"]
  },
  "include": ["src"]
}
```

---

## Step 4 — Create `vite.config.ts`

Create file at `vite.config.ts`:

```ts
import { defineConfig } from 'vite';

export default defineConfig({
  base: './',
  build: {
    outDir: 'dist',
  },
  test: {
    globals: true,
    environment: 'node',
  },
});
```

---

## Step 5 — Create `index.html`

Create file at `index.html`:

```html
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <title>Breakout</title>
    <style>
      * { margin: 0; padding: 0; box-sizing: border-box; }
      body {
        background: #111;
        display: flex;
        justify-content: center;
        align-items: center;
        height: 100vh;
        overflow: hidden;
      }
      canvas { display: block; }
    </style>
  </head>
  <body>
    <script type="module" src="/src/main.ts"></script>
  </body>
</html>
```

---

## Step 6 — Create `src/config/SceneKeys.ts`

```ts
export const SceneKeys = {
  PRELOADER: 'PRELOADER',
  MAIN_MENU: 'MAIN_MENU',
  GAME: 'GAME',
  HUD: 'HUD',
  GAME_OVER: 'GAME_OVER',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
```

---

## Step 7 — Create `src/config/AssetKeys.ts`

```ts
export const AssetKeys = {
  BALL: 'ball',
  PADDLE: 'paddle',
  BRICK: 'brick',
} as const;

export type AssetKey = (typeof AssetKeys)[keyof typeof AssetKeys];
```

---

## Step 8 — Create `src/config/Events.ts`

```ts
export const Events = {
  BRICK_DESTROYED: 'brick_destroyed',
  SCORE_CHANGED: 'score_changed',
  LIFE_LOST: 'life_lost',
  GAME_OVER: 'game_over',
  BALL_CEILING_HIT: 'ball_ceiling_hit',
  BALL_RESET: 'ball_reset',
} as const;

export type EventKey = (typeof Events)[keyof typeof Events];
```

---

## Step 9 — Create `src/config/Balance.ts`

```ts
export const Balance = {
  // Canvas
  CANVAS_WIDTH: 480,
  CANVAS_HEIGHT: 640,

  // Ball
  BALL_SPEED_INITIAL: 300,
  BALL_SPEED_INCREMENT: 10,
  BALL_SPEED_MAX: 700,
  BALL_SIZE: 12,

  // Paddle
  PADDLE_WIDTH_NORMAL: 100,
  PADDLE_WIDTH_NARROW: 60,
  PADDLE_HEIGHT: 14,
  PADDLE_SPEED: 500,
  PADDLE_Y_OFFSET: 40,

  // Bricks
  BRICK_ROWS: 8,
  BRICK_COLS: 14,
  BRICK_WIDTH: 28,
  BRICK_HEIGHT: 16,
  BRICK_PADDING: 4,
  BRICK_OFFSET_TOP: 80,
  BRICK_OFFSET_LEFT: 10,
  BRICK_SCORE_DEFAULT: 1,

  // Lives
  LIVES_START: 3,

  // Row scores (top to bottom)
  ROW_SCORES: [7, 7, 5, 5, 3, 3, 1, 1] as number[],

  // Row colours (Phaser 4 hex values, top to bottom)
  ROW_COLORS: [
    0xff4444, 0xff4444,
    0xff8800, 0xff8800,
    0x44dd44, 0x44dd44,
    0xffdd00, 0xffdd00,
  ] as number[],

  // Wall / ceiling visual thickness
  WALL_THICKNESS: 8,
} as const;
```

---

## Step 10 — Create `src/config/TauriCommands.ts`

```ts
export const TauriCommands = {
  SAVE_HIGH_SCORE: 'save_high_score',
  LOAD_HIGH_SCORE: 'load_high_score',
} as const;
```

---

## Step 11 — Create `src/systems/EventBus.ts`

```ts
import { Events as PhaserEvents } from 'phaser';
export const EventBus = new PhaserEvents.EventEmitter();
```

---

## Step 12 — Create `src/systems/GameState.ts`

```ts
import { EventBus } from './EventBus';
import { Events } from '../config/Events';
import { Balance } from '../config/Balance';

export class GameState {
  private score: number = 0;
  private lives: number = Balance.LIVES_START;
  private ballSpeed: number = Balance.BALL_SPEED_INITIAL;
  private highScore: number = 0;

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

    EventBus.emit(Events.SCORE_CHANGED, { score: this.score });
  }

  onLifeLost(): void {
    this.lives -= 1;

    if (this.lives <= 0) {
      this.lives = 0;
      if (this.score > this.highScore) {
        this.highScore = this.score;
      }
      EventBus.emit(Events.GAME_OVER, { score: this.score });
    }
  }
}

export const gameState = new GameState();
```

---

## Step 13 — Create `src/systems/GameState.test.ts`

```ts
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
```

---

## Step 14 — Create `src/systems/Platform.ts`

```ts
const HIGH_SCORE_KEY = 'breakout_high_score';

export const Platform = {
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
      if (raw === null) { return 0; }
      const parsed = parseInt(raw, 10);
      return isNaN(parsed) ? 0 : parsed;
    } catch {
      return 0;
    }
  },
};
```

---

## Step 15 — Create `src/systems/Debug.ts`

```ts
const DEBUG = false;

export const Debug = {
  log(...args: unknown[]): void {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.log('[DEBUG]', ...args);
    }
  },

  warn(...args: unknown[]): void {
    if (DEBUG) {
      // eslint-disable-next-line no-console
      console.warn('[DEBUG WARN]', ...args);
    }
  },
};
```

---

## Step 16 — Create `src/test/mocks/PhaserMocks.ts`

```ts
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
```

---

## Step 17 — Create `src/scenes/PreloaderScene.ts`

```ts
import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';

export const PreloaderScene: Scene = {
  key: SceneKeys.PRELOADER,

  preload() {},

  create() {
    generateBallTexture(this);
    generatePaddleTexture(this);
    generateBrickTexture(this);
    this.scene.start(SceneKeys.GAME);
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

## Step 18 — Create `src/scenes/GameScene.ts`

```ts
import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';
import { Balance } from '../config/Balance';

const WALL_COLOR = 0x8888ff;
const CEILING_COLOR = 0x8888ff;

export const GameScene: Scene = {
  key: SceneKeys.GAME,

  create() {
    const { width, height } = this.sys.game.config as { width: number; height: number };
    const t = Balance.WALL_THICKNESS;

    this.physics.world.setBounds(t, t, width - t * 2, height - t, true, true, true, false);

    const gfx = this.add.graphics();

    gfx.fillStyle(WALL_COLOR, 1);
    gfx.fillRect(0, 0, t, height);

    gfx.fillStyle(WALL_COLOR, 1);
    gfx.fillRect(width - t, 0, t, height);

    gfx.fillStyle(CEILING_COLOR, 1);
    gfx.fillRect(0, 0, width, t);

    this.scene.launch(SceneKeys.HUD);
  },

  update(_time: number, _delta: number) {},
};
```

---

## Step 19 — Create `src/scenes/HudScene.ts`

This file was not yet completed by the previous agent. Create it now:

```ts
import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';
import { Balance } from '../config/Balance';

export const HudScene: Scene = {
  key: SceneKeys.HUD,

  create() {
    const { width } = this.sys.game.config as { width: number };

    const scoreText = this.add.text(16, 16, 'SCORE: 0', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    const livesText = this.add.text(width / 2, 16, 'LIVES: 3', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    const hiText = this.add.text(width - 16, 16, 'HI: 0', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    EventBus.on(Events.SCORE_CHANGED, ({ score }: { score: number }) => {
      scoreText.setText(`SCORE: ${score}`);
      hiText.setText(`HI: ${gameState.getHighScore()}`);
    });

    EventBus.on(Events.LIFE_LOST, () => {
      livesText.setText(`LIVES: ${gameState.getLives()}`);
    });

    EventBus.on(Events.GAME_OVER, () => {
      hiText.setText(`HI: ${gameState.getHighScore()}`);
    });

    this.events.on('shutdown', () => {
      EventBus.off(Events.SCORE_CHANGED);
      EventBus.off(Events.LIFE_LOST);
      EventBus.off(Events.GAME_OVER);
    });
  },
};
```

---

## Step 20 — Create `src/main.ts`

This file was not yet completed by the previous agent. Create it now:

```ts
import { Game, AUTO } from 'phaser';
import { PreloaderScene } from './scenes/PreloaderScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
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
  scene: [PreloaderScene, GameScene, HudScene],
});
```

---

## Step 21 — Install dependencies

```bash
npm install
```

---

## Step 22 — Run the tests

```bash
npm test
```

All 7 tests in `GameState.test.ts` should pass. Fix any failures before continuing.

---

## Step 23 — Start the dev server

```bash
npm run dev
```

Open the URL printed in the terminal. You should see a 480×640 black canvas with a blue-tinted left wall, right wall, and ceiling. No ball, paddle, or bricks yet — those are step 2.

---

## Notes for the next agent

- The physics world bottom is intentionally **open** (`false` as the fourth bound flag). Do not change this.
- `BRICK_WIDTH` is 28px, not 48px — the 48px from GAME_DESIGN.md overflows the canvas at 14 columns.
- All entity files (`Ball`, `Paddle`, `Brick`) still need to be created in `src/entities/`. Each must have a corresponding `.test.ts` file per AGENTS.md requirements.
- The `src/ui/` directory exists but is empty — HUD text components can be extracted there in a later step if the HudScene grows complex.
- Do not use class-based Phaser scenes, monolithic Phaser imports, or `this.physics.add.*` — see AGENTS.md for the Phaser 4 patterns required.


