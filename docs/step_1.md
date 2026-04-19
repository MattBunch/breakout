


## Step 1 Walkthrough — Game Space with Walls and Ceiling

Let me walk through every file created, what it does, and why each decision was made.

---

### The Config Layer (`src/config/`)

This is the foundation everything else reads from. Four files, each with a single responsibility.

**`SceneKeys.ts`** defines string constants for every scene (`PRELOADER`, `GAME`, `HUD`, etc.). Phaser identifies scenes by string key — without constants, you'd have raw strings scattered everywhere and a typo would cause a silent runtime failure with no TypeScript error to catch it.

**`AssetKeys.ts`** does the same thing for texture names (`ball`, `paddle`, `brick`). When `PreloaderScene` generates a texture and when `GameScene` later creates a sprite from it, both sides reference the same constant rather than typing the string twice.

**`Events.ts`** defines the event name strings for the EventBus (`brick_destroyed`, `life_lost`, etc.). The AGENTS.md file explicitly forbids raw strings in `emit` and `on` calls, and for good reason — an event with a mistyped name fails silently and is extremely hard to debug.

**`Balance.ts`** is the most important config file. Every tunable number in the game lives here — ball speed, brick dimensions, paddle size, lives count, row scores, row colours. The GAME_DESIGN.md specifies this explicitly: agents should modify values here, never inline them in scene or entity code. This also means you can tune the whole game by editing one file.

One decision worth noting: `BRICK_WIDTH` was set to 28px rather than the 48px in GAME_DESIGN.md's example. At 14 columns with 4px padding on a 480px canvas, 48px bricks would overflow the play area. The math: 14 × 48 + 13 × 4 = 724px, which is wider than the canvas. At 28px: 14 × 28 + 13 × 4 = 444px, which fits inside the 480px canvas with the 8px walls on each side eating another 16px.

---

### The Systems Layer (`src/systems/`)

These are plain TypeScript classes with no Phaser dependency — they manage state and communication.

**`EventBus.ts`** is a single exported instance of Phaser's `Events.EventEmitter`. It's the communication backbone of the whole game. Instead of scenes holding direct references to each other (which creates tight coupling and breaks when scenes aren't active), anything that needs to broadcast a change emits on the bus, and anything that cares listens on it. A brick getting destroyed doesn't need to know the HUD exists — it just emits `BRICK_DESTROYED` and the HUD's listener handles updating the score text.

**`GameState.ts`** is the single source of truth for score, lives, and ball speed. No other file increments score or decrements lives directly. The public methods (`onBrickDestroyed`, `onLifeLost`) do the mutation and then fire EventBus events so listeners react. This is the architecture pattern the AGENTS.md data flow diagram describes precisely. The `gameState` singleton is exported at the bottom — all scenes import this one instance.

A specific decision: `onBrickDestroyed` takes a `rowIndex` parameter so it can look up `Balance.ROW_SCORES[rowIndex]` for per-row scoring. If the index is out of range, it falls back to `BRICK_SCORE_DEFAULT`. This means the coloured brick row scoring from GAME_DESIGN.md is already wired in even though it's listed as a stretch goal.

**`Platform.ts`** isolates every place the code touches the outside world for persistence. Right now it's just `localStorage` for high score. When Tauri desktop support is added, only this file changes — all callers stay the same. The AGENTS.md is explicit about not scattering `isTauri()` calls through game logic.

**`Debug.ts`** is a simple logging wrapper with a `DEBUG` flag set to `false`. The AGENTS.md forbids `console.log` in committed code, so any temporary debug logging during development goes through this instead.

---

### The Test Layer (`src/test/mocks/PhaserMocks.ts`)

Phaser can't run in a Node test environment — it needs a browser canvas. So the mocks provide fake versions of the Phaser objects that entities and systems need: a scene with `add.graphics()` and `add.text()`, a sprite with physics body methods, etc. Every mock method returns `this` (for method chaining) or a fake object. The AGENTS.md requires a `.test.ts` file for every file in `systems/` and `entities/`, and the tests import from here rather than from Phaser itself.

**`GameState.test.ts`** is the first real test file. It mocks `EventBus` with `vi.mock()` (so `emit` calls don't fail), then tests every public state transition: score increments by the correct row amount, ball speed increases but caps at `BALL_SPEED_MAX`, lives decrement and stop at zero, `reset()` restores all defaults.

---

### The Scene Layer (`src/scenes/`)

**`PreloaderScene.ts`** runs first and generates all three textures — ball, paddle, brick — using Phaser's `Graphics.generateTexture()`. This draws shapes to an off-screen canvas and captures the result as a named texture. The advantage is that the project has zero image file dependencies. The brick gets a subtle inner shadow (two dark edges) for a slight 3D feel even though it's a flat rectangle.

**`GameScene.ts`** is the only step-1 deliverable that actually shows something. Two things happen in `create()`:

First, `this.physics.world.setBounds(t, t, width - t*2, height - t, true, true, true, false)` sets the physics world boundary. The four boolean flags at the end control which edges are solid. Left, right, and top are `true` (the ball bounces off them). Bottom is `false` — the ball passes through and exits the screen, which is how the game detects a missed ball and triggers a life-lost event. The offset by `t` (wall thickness) on all sides means the physics boundary lines up exactly with the inner edge of the visual walls.

Second, a `Graphics` object draws the visual walls and ceiling. These are purely decorative — the actual collision comes from world bounds. The walls are drawn as filled rectangles: left wall from `(0,0)` to `(t, height)`, right wall from `(width-t, 0)` to `(width, height)`, ceiling from `(0,0)` to `(width, t)`.

Then it launches the HUD scene in parallel with `this.scene.launch(SceneKeys.HUD)`. Parallel scenes in Phaser render on top of each other, which is how score and lives can be drawn over the gameplay without being part of the GameScene itself.

---

### What's still needed to boot

`src/main.ts` and `src/scenes/HudScene.ts` still need to be written to wire everything together and make it runnable. Everything else is in place — the config, the systems, the mocks, the preloader, and the game space itself.


