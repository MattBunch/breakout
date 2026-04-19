# AGENTS.md — AI Agent Guide

> This file tells AI coding agents (Claude Code, Codex, Cursor, etc.) how this project is structured, what conventions to follow, and what guardrails to respect. Read this before making any changes.

---

## Project Overview

**Game Name:** Breakout
**Genre:** Arcade / Ball-and-Paddle
**Stack:** Phaser 4 "Caladan" (game engine) + Tauri 2.0 (desktop wrapper) + TypeScript
**Targets:** Browser (Web) and Desktop (Windows/macOS/Linux via Tauri → Steam)

---

## Repository Structure

```
/
├── src/
│   ├── scenes/          # Phaser 4 functional scene objects (one file per scene)
│   ├── entities/        # Game objects (Ball, Paddle, Brick, etc.)
│   ├── systems/         # Reusable logic (Platform, EventBus, GameState, etc.)
│   ├── ui/              # HUD, menus, overlays
│   ├── config/          # Game config, constants, balance values
│   │   ├── AssetKeys.ts
│   │   ├── Balance.ts
│   │   ├── SceneKeys.ts
│   │   ├── Events.ts
│   │   └── TauriCommands.ts
│   └── main.ts          # Entry point — Phaser Game config
├── src-tauri/           # Tauri Rust source (DO NOT edit unless necessary)
│   ├── src/main.rs
│   └── tauri.conf.json
├── public/              # Static assets served by Vite
├── dist/                # Build output (gitignored)
├── index.html
├── vite.config.ts
├── tsconfig.json
├── package.json
└── AGENTS.md            # ← You are here
```

---

## Tech Stack & Versions

| Tool | Version | Purpose |
|------|---------|---------|
| Phaser | `^4.0.0` ("Caladan") | Game engine |
| TypeScript | `^5.x` | Language |
| Vite | `^5.x` | Dev server + bundler |
| Tauri | `^2.x` | Desktop wrapper |
| Rust | stable | Required by Tauri |

---

## ⚠️ CRITICAL: Phaser 4 API — Do Not Use Phaser 3 Patterns

This project uses **Phaser 4 ("Caladan")**. Your training data is heavily biased toward Phaser 3. The following rules are mandatory. If you are unsure about a specific Phaser 4 API, stop and ask the developer rather than falling back to Phaser 3 syntax.

---

### Imports — Modular ESM, No Global `Phaser` Object

```typescript
// ✅ CORRECT — Phaser 4 modular imports
import { Game, Scene, Sprite, GameObjects } from 'phaser';
import { ArcadePhysics } from '@phaser/physics/arcade';

// ❌ WRONG — Phaser 3 monolithic import (do not use)
import Phaser from 'phaser';

// ❌ WRONG — Phaser 3 global object (do not use)
const sprite = this.physics.add.sprite(x, y, key);
```

---

### Scenes — Functional Structure, Not Class Inheritance

```typescript
// ✅ CORRECT — Phaser 4 functional scene
import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';

export const GameScene: Scene = {
  key: SceneKeys.GAME,
  preload() { ... },
  create() { ... },
  update(time: number, delta: number) { ... },
};

// ❌ WRONG — Phaser 3 class-based scene (do not use)
export class GameScene extends Phaser.Scene {
  constructor() { super({ key: 'GameScene' }); }
  preload() { ... }
  create() { ... }
}
```

---

### Physics — Explicit Import from `@phaser/physics/arcade`

```typescript
// ✅ CORRECT — Phaser 4 explicit physics import
import { ArcadePhysics } from '@phaser/physics/arcade';

// ❌ WRONG — Phaser 3 shorthand on scene context (do not use)
this.physics.add.sprite(x, y, key);
this.physics.add.collider(a, b, callback);
```

---

### Tinting

```typescript
// ✅ CORRECT — Phaser 4
import { TintModes } from 'phaser';
sprite.setTint(0xff0000).setTintMode(TintModes.FILL);
sprite.clearTint();

// ❌ WRONG — removed in Phaser 4 (do not use)
sprite.setTintFill(0xff0000);
```

---

### Texture Management

```typescript
// ✅ CORRECT — Phaser 4 dynamic texture swapping
texture.setSource(newImageData);

// ❌ WRONG — Phaser 3 pattern (do not use)
this.textures.get(key).setFrame(frameName);
```

---

### New First-Class Game Objects in Phaser 4

These exist in Phaser 4 and can be used when appropriate:

```typescript
import { Noise, Gradient, Shader } from 'phaser';

// Noise — procedural noise rendering
// Gradient — GPU gradient fills (useful for brick row colours)
// Shader — inline shader objects
```

---

### Game Config (`src/main.ts`)

```typescript
// ✅ CORRECT — Phaser 4 config shape
import { Game, AUTO } from 'phaser';
import { GameScene } from './scenes/GameScene';
import { PreloaderScene } from './scenes/PreloaderScene';

const config = {
  type: AUTO,
  width: 480,
  height: 640,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: { gravity: { y: 0 }, debug: false },
  },
  scene: [PreloaderScene, GameScene],
};

new Game(config);
```

---

### When in Doubt

> Do not guess. If a Phaser 4 API is unfamiliar or you cannot find it in your training data, tell the developer explicitly rather than substituting a Phaser 3 equivalent. The developer will provide the correct API.

---

## Dev Commands

```bash
npm install          # Install dependencies
npm run dev          # Web dev server (browser mode)
npm run tauri:dev    # Tauri desktop dev mode
npm run build        # Build for web → /dist
npm run tauri:build  # Build desktop installers
npm run typecheck    # Type-check without emitting
npm run test         # Run tests (Vitest)
npm run test:watch   # Run tests in watch mode
npm run test:coverage # Run tests with coverage report
```

---

## Coding Conventions

### General
- All source is **TypeScript**. No plain `.js` in `src/`.
- `const` by default; `let` only when mutation is required.
- No `any`. Use `unknown` for genuinely unknown types.
- No `console.log` in committed code — use `src/systems/Debug.ts`.

### TypeScript Style Rules

**Always use braces for `if` statements — no exceptions.**

Single-line braceless `if` statements are forbidden, even for trivial guards. This applies to `else` and `else if` branches too.

```typescript
// ✅ CORRECT
if (lives <= 0) {
  this.gameOver();
}

if (velocity > Balance.BALL_SPEED_MAX) {
  velocity = Balance.BALL_SPEED_MAX;
} else {
  velocity += Balance.BALL_SPEED_INCREMENT;
}

// ❌ WRONG — no braces
if (lives <= 0) this.gameOver();

// ❌ WRONG — braceless single condition
if (velocity > Balance.BALL_SPEED_MAX) velocity = Balance.BALL_SPEED_MAX;

// ❌ WRONG — && used as braceless if
lives <= 0 && this.gameOver();
```

### Phaser 4 Scene Conventions
- All scenes live in `src/scenes/` and use the **functional** scene structure (see above).
- Scene keys are `SCREAMING_SNAKE_CASE` constants in `src/config/SceneKeys.ts`.
- Do not use `this` to reference scene context — functional scenes use the scene object's own properties directly.

### Entity Conventions
- Entities (Ball, Paddle, Brick) live in `src/entities/`.
- Prefer **composition** over extending Phaser game objects.
- Magic numbers (ball speed, paddle width, brick rows) belong in `src/config/Balance.ts`.
- Asset keys are constants in `src/config/AssetKeys.ts`. Never use raw strings for asset keys.

### Cross-Scene Communication
- Use a global `EventBus` in `src/systems/EventBus.ts`.
- Scene-internal events use the scene's own event emitter.

### Tauri Conventions
- Do **not** edit `src-tauri/` unless the task explicitly requires native features.
- Tauri command name strings are constants in `src/config/TauriCommands.ts`.
- Use `invoke()` from `@tauri-apps/api` to call Rust commands from TypeScript.

---

## Platform Differences

```typescript
import { isTauri } from '@tauri-apps/api/core';
const isDesktop = await isTauri();
```

| Feature | Browser | Desktop (Tauri) |
|---------|---------|-----------------|
| High score persistence | `localStorage` | Tauri file system API |
| Fullscreen | Browser Fullscreen API | Tauri window API |
| Audio context unlock | Requires user gesture | Works immediately |
| Steam features | Not available | Via Rust sidecar (future) |

Isolate all platform-branching logic in `src/systems/Platform.ts`. Do not scatter `isTauri()` calls throughout game logic.

---

## State Management

- Game state (score, lives, high score) lives in `src/systems/GameState.ts`.
- Plain TypeScript class — no third-party state libraries.
- `GameState.save()` and `GameState.load()` delegate to `Platform.ts`.

---

## Architecture Patterns

### Scene Responsibility

Scenes are **coordinators only**. A scene's `create()` wires up entities, groups, colliders, and event listeners. Its `update()` fans out to entity update methods. Scenes do not contain scoring logic, brick counting, speed calculations, or life management — those live in systems or entities.

```typescript
// ✅ CORRECT — scene delegates to entities
export const GameScene: Scene = {
  key: SceneKeys.GAME,
  update(time: number, delta: number) {
    paddle.update(delta);
    ball.update(delta);
  },
};

// ❌ WRONG — scene as god class (also violates brace style rules)
export const GameScene: Scene = {
  key: SceneKeys.GAME,
  update(time: number, delta: number) {
    if (ball.x < 0) { ball.x = 0; }
    if (score > highScore) { highScore = score; }
    scoreText.setText(`SCORE: ${score}`);
    // ...50 more lines
  },
};
```

### Entity Pattern

Entities wrap a Phaser physics sprite and expose a clean interface. The scene never reaches into `entity.sprite.body` directly.

```typescript
import { ArcadePhysics } from '@phaser/physics/arcade';
import { Scene } from 'phaser';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';

export class Paddle {
  private sprite: ArcadePhysics.Sprite;

  constructor(scene: Scene, x: number, y: number) {
    this.sprite = ArcadePhysics.createSprite(scene, x, y, AssetKeys.PADDLE);
    this.sprite.setImmovable(true).setCollideWorldBounds(true);
    this.setWidth(Balance.PADDLE_WIDTH_NORMAL);
  }

  getSprite() {
    return this.sprite;
  }

  update(delta: number) {
    // movement logic lives here, not in the scene
  }

  setWidth(width: number) {
    this.sprite.setDisplaySize(width, Balance.PADDLE_HEIGHT);
  }
}
```

### Brick Group — Use StaticGroup

Bricks do not move. Always use a static group, not a dynamic group. Static bodies are significantly cheaper and correct for this use case.

```typescript
// ✅ CORRECT — Phaser 4 static group via ArcadePhysics
import { ArcadePhysics } from '@phaser/physics/arcade';
const bricks = ArcadePhysics.createStaticGroup(scene);

// ❌ WRONG — dynamic group, wasteful for non-moving bricks
const bricks = ArcadePhysics.createGroup(scene);
```

### Collision Callbacks — Minimum Work Only

Callbacks fire inside the physics step. Do the minimum (destroy the object, emit an event) and nothing else. Never update score, lives, speed, or UI directly inside a callback.

```typescript
// ✅ CORRECT
function onBallHitBrick(
  ball: GameObjects.GameObject,
  brick: GameObjects.GameObject
): void {
  brick.destroy();
  EventBus.emit(Events.BRICK_DESTROYED, { brick });
}

// ❌ WRONG — business logic inside the callback
function onBallHitBrick(ball: GameObjects.GameObject, brick: GameObjects.GameObject): void {
  brick.destroy();
  score += Balance.BRICK_SCORE_DEFAULT;
  scoreText.setText(`SCORE: ${score}`);
  ballSpeed += Balance.BALL_SPEED_INCREMENT;
}
```

### EventBus Events

Define all event name strings as constants in `src/config/Events.ts`. Never use raw strings in `emit` or `on` calls.

```typescript
// src/config/Events.ts
export const Events = {
  BRICK_DESTROYED:   'brick_destroyed',
  LIFE_LOST:         'life_lost',
  GAME_OVER:         'game_over',
  SCORE_CHANGED:     'score_changed',
  BALL_CEILING_HIT:  'ball_ceiling_hit',
} as const;
```

### EventBus Implementation

```typescript
// src/systems/EventBus.ts
import { Events as PhaserEvents } from 'phaser';
export const EventBus = new PhaserEvents.EventEmitter();
```

---

## Data Flow

The following is the authoritative data flow for the core game loop. Agents generating any system, entity, or scene must follow this wiring exactly — do not invent alternative event paths.

```
Ball hits brick
  → Phaser 4 collider callback fires
  → brick.destroy()
  → EventBus.emit(Events.BRICK_DESTROYED)
      → GameState.onBrickDestroyed()   [increments score, increments ball speed]
          → EventBus.emit(Events.SCORE_CHANGED)
              → HUD updates score text
      → Ball.incrementSpeed()          [reads updated speed from GameState]

Ball exits bottom of screen
  → Detected in Ball.update() or scene update()
  → EventBus.emit(Events.LIFE_LOST)
      → GameState.onLifeLost()         [decrements lives]
          → if lives === 0: EventBus.emit(Events.GAME_OVER)
                → GameScene transitions to GameOverScene
          → else: ball and paddle reset to start positions

Ball hits ceiling (first time per life)
  → Detected in Ball.update() via world bounds check
  → EventBus.emit(Events.BALL_CEILING_HIT)
      → Paddle.setWidth(Balance.PADDLE_WIDTH_NARROW)  [stretch goal]
```

---

## Test Requirements

- Every new file in `src/systems/` and `src/entities/` must have a corresponding `.test.ts` file in the same directory.
- Tests use **Vitest**. Import scene/physics mocks from `src/test/mocks/PhaserMocks.ts`.
- Do not test Phaser rendering, physics simulation, or scene lifecycle.
- Test all public methods on entities and all state transitions in systems.
- Run `npm test` after every batch and fix all failures before moving on.

---

## What AI Agents Should and Should Not Do

### ✅ Safe to generate/modify
- Scenes in `src/scenes/`
- Entities in `src/entities/`
- Config values in `src/config/`
- UI components in `src/ui/`
- Tests in `src/**/*.test.ts`

### ⚠️ Modify with care
- `src/main.ts` — Phaser Game config; changes affect both targets
- `src/systems/Platform.ts` — dual-target logic; test both modes after changes
- `vite.config.ts` — confirm both web and Tauri builds still work

### 🚫 Do not touch without explicit instruction
- `src-tauri/` — Rust source; requires a full Rust build step
- `src-tauri/tauri.conf.json` — app identity and permissions
- `package.json` scripts — do not rename or remove existing scripts
- `dist/` — build output only

---

## Common Pitfalls

1. **Phaser 3 drift** — Your training data favours Phaser 3 heavily. Re-read the Phaser 4 API section above before writing any engine code. When in doubt, ask rather than guessing.
2. **Class-based scenes** — Phaser 4 uses functional scene objects. Do not write `extends Phaser.Scene`.
3. **Monolithic import** — Never `import Phaser from 'phaser'`. Always use named modular imports.
4. **Asset loading timing** — Load all assets in the `PreloaderScene`. Never call load methods outside of `preload()`.
5. **Audio on web** — Gate first audio playback behind a user gesture, or listen for Phaser's `AudioContextUnlocked` event.
6. **Tauri hot-reload** — Web content hot-reloads; Rust does not. Restart `tauri:dev` after editing `src-tauri/`.
7. **High score on desktop** — Route through `Platform.ts`, not `localStorage` directly.

---

## Out of Scope (for now)

- Multiplayer / networking
- Steamworks integration — planned post-launch
- Mobile (iOS/Android)
- Localization

---

## Questions?

If a task is ambiguous, a Phaser 4 API is unclear, or changes are needed outside the "Safe to modify" list — stop and ask rather than guessing.
