# GAME_DESIGN.md — Breakout

> This document describes the complete design of the game. AI agents should read this before generating any scene, entity, or balance logic, and treat it as the authoritative source of truth for gameplay rules.

---

## Concept

A faithful recreation of Atari's 1976 arcade classic **Breakout**, with modern stretch goals. The player controls a paddle at the bottom of the screen and bounces a ball upward to destroy rows of bricks. The game ends when all lives are lost or all bricks are cleared.

**Historical note:** The original Breakout arcade cabinet was co-designed by Steve Jobs and Steve Wozniak, built from discrete transistors. This version uses Phaser 4.

---

## Core Gameplay Loop

1. Ball launches from paddle toward the brick field.
2. Ball bounces off walls, ceiling, paddle, and bricks.
3. Hitting a brick destroys it and awards points.
4. Each brick destroyed slightly increases ball speed.
5. Missing the ball costs a life.
6. Game ends when lives reach zero or all bricks are cleared (level complete).

---

## Game Space

- The play area has a **left wall, right wall, and ceiling** that the ball bounces off.
- The **bottom is open** — missing the ball there costs a life.
- No bottom wall. The ball exits the screen at the bottom.

---

## Paddle

| Property | Value |
|----------|-------|
| Position | Bottom of screen, horizontally centered on start |
| Movement | Left/Right — keyboard (Arrow keys + WASD) and mouse/touch |
| Constraint | Cannot move beyond left or right walls |
| Width (normal) | See `Balance.ts` → `PADDLE_WIDTH_NORMAL` |
| Width (narrow) | See `Balance.ts` → `PADDLE_WIDTH_NARROW` (stretch goal) |

**Stretch goal — Paddle narrows:** Once the ball reaches the ceiling for the first time, the paddle width permanently reduces to `PADDLE_WIDTH_NARROW` for the rest of the life/level.

---

## Ball

| Property | Value |
|----------|-------|
| Shape | Circle (rendered as a square sprite is acceptable for retro feel) |
| Start position | Just above the paddle center |
| Launch angle | Slightly randomised upward angle to prevent perfectly vertical shots |
| Bounce | Reflect angle off all surfaces using arcade physics |
| Speed | Starts at `BALL_SPEED_INITIAL`; increases by `BALL_SPEED_INCREMENT` per brick destroyed |
| Speed cap | `BALL_SPEED_MAX` — prevents ball from becoming unplayable |

**Paddle angle influence:** Where the ball hits the paddle affects the bounce angle. Hitting the edge of the paddle deflects the ball at a shallower angle toward that side; hitting the centre returns it more vertically. This gives the player directional control.

---

## Bricks

| Property | Value |
|----------|-------|
| Grid | 8 rows × 14 bricks (adjust to fit canvas; original was 8×16) |
| Position | Upper portion of the game space, with a gap below the ceiling |
| On hit | Brick is destroyed; score increases; ball speed increases |
| Collision | Ball bounces off the side/top/bottom of the brick it contacts |

### Row Colours (Stretch Goal)

Original Breakout used a coloured film overlay. Replicate with distinct tint per row pair:

| Rows | Colour | Points per brick |
|------|--------|-----------------|
| 1–2 (top) | Red | 7 |
| 3–4 | Orange | 5 |
| 5–6 | Green | 3 |
| 7–8 (bottom) | Yellow | 1 |

If colour rows are not implemented, all bricks are worth a flat `BRICK_SCORE_DEFAULT` points.

---

## Scoring

- Score is displayed in the HUD at all times.
- Breaking a brick adds its point value to the score.
- **Stretch goal:** A persistent high score is saved between sessions via `Platform.ts` and displayed in the HUD alongside the current score.

---

## Lives

- Player starts with **3 lives**.
- A life is lost when the ball exits the bottom of the screen.
- On life loss: ball resets to above the paddle; paddle resets to centre; speed does not reset (keeps its accumulated value).
- When lives reach 0: transition to **Game Over** scene.

---

## Scenes

| Scene Key | Purpose |
|-----------|---------|
| `PRELOADER` | Load all assets |
| `MAIN_MENU` | Title screen, high score display, start button |
| `GAME` | Core gameplay |
| `HUD` | Overlay — score, lives, high score (runs in parallel with GAME) |
| `GAME_OVER` | Final score, high score update, restart prompt |
| `LEVEL_CLEAR` | (Optional) Shown when all bricks are destroyed before lives run out |

Scene keys are defined as constants in `src/config/SceneKeys.ts`.

---

## HUD Layout

```
┌─────────────────────────────────┐
│  SCORE: 0000   LIVES: ❤❤❤   HI: 0000  │
├─────────────────────────────────┤
│                                 │
│   [ brick field ]               │
│                                 │
│                                 │
│           ══════  (paddle)      │
└─────────────────────────────────┘
```

---

## Balance Constants (`src/config/Balance.ts`)

All tunable values live here. Agents should modify values here, not inline in scene/entity code.

```typescript
export const Balance = {
  // Ball
  BALL_SPEED_INITIAL: 300,       // px/s
  BALL_SPEED_INCREMENT: 10,      // added per brick destroyed
  BALL_SPEED_MAX: 700,           // hard cap

  // Paddle
  PADDLE_WIDTH_NORMAL: 100,      // px
  PADDLE_WIDTH_NARROW: 60,       // px (stretch goal, after ball hits ceiling)
  PADDLE_HEIGHT: 14,             // px
  PADDLE_SPEED: 500,             // px/s (keyboard movement)

  // Bricks
  BRICK_ROWS: 8,
  BRICK_COLS: 14,
  BRICK_WIDTH: 48,               // px
  BRICK_HEIGHT: 16,              // px
  BRICK_PADDING: 4,              // px gap between bricks
  BRICK_OFFSET_TOP: 80,          // px from top of play area to first row
  BRICK_SCORE_DEFAULT: 1,        // pts if no colour rows

  // Lives
  LIVES_START: 3,

  // Row scores (stretch goal, top to bottom)
  ROW_SCORES: [7, 7, 5, 5, 3, 3, 1, 1],

  // Row colours (Phaser 4 hex values, stretch goal)
  ROW_COLORS: [0xff4444, 0xff4444, 0xff8800, 0xff8800, 0x44dd44, 0x44dd44, 0xffdd00, 0xffdd00],
};
```

---

## Input Handling

| Input | Action |
|-------|--------|
| ← / A | Move paddle left |
| → / D | Move paddle right |
| Mouse move | Paddle follows cursor X position |
| Touch drag | Paddle follows touch X position |
| Space / Click | Launch ball (when waiting after life loss or at game start) |

---

## Audio (Optional but Recommended)

| Event | Sound |
|-------|-------|
| Ball hits paddle | `sfx_paddle` |
| Ball hits wall/ceiling | `sfx_wall` |
| Brick destroyed | `sfx_brick` |
| Life lost | `sfx_life_lost` |
| Game over | `sfx_game_over` |

All audio keys defined in `src/config/AssetKeys.ts`. Web platform requires audio unlock before first play — handle via Phaser's `AudioContextUnlocked` event.

---

## Stretch Goals (Priority Order)

1. **High score persistence** — Save/load via `Platform.ts`; display in HUD and Main Menu.
2. **Coloured brick rows** — Apply per-row tint using Phaser 4's `setTint(color).setTintMode(TintModes.FILL)`.
3. **Narrow paddle trigger** — Reduce paddle width when ball first contacts ceiling.

---

## Out of Scope

- Multiple levels / progressive difficulty beyond speed increase
- Power-ups
- Multiplayer
- Mobile-specific UI (though touch input should work)

---

## Data Flow

The following is the authoritative wiring for the core game loop. All agents generating scenes, entities, or systems must follow this exactly.

```
Ball hits brick
  → Phaser collider callback fires
  → brick.destroy()
  → EventBus.emit(Events.BRICK_DESTROYED)
      → GameState.onBrickDestroyed()   [increments score, increments ball speed]
          → EventBus.emit(Events.SCORE_CHANGED)
              → HUD updates score text
      → Ball.incrementSpeed()          [reads updated speed from GameState]

Ball exits bottom of screen
  → Detected in Ball.update() or scene.update()
  → EventBus.emit(Events.LIFE_LOST)
      → GameState.onLifeLost()         [decrements lives]
          → if lives === 0: EventBus.emit(Events.GAME_OVER)
                → GameScene transitions to GameOverScene
          → else: ball and paddle reset to start positions

Ball hits ceiling (first time per life)
  → Detected in Ball.update() via body.blocked.up or world bounds check
  → EventBus.emit(Events.BALL_CEILING_HIT)
      → Paddle.setWidth(Balance.PADDLE_WIDTH_NARROW)  [stretch goal]
```

---

## Event Reference (`src/config/Events.ts`)

All event name strings must be defined here as constants. Raw strings in `emit` or `on` calls are not permitted.

| Constant | String value | Payload | Emitted by | Consumed by |
|----------|-------------|---------|------------|-------------|
| `BRICK_DESTROYED` | `'brick_destroyed'` | `{ brick }` | Collision callback | `GameState`, `Ball` |
| `SCORE_CHANGED` | `'score_changed'` | `{ score: number }` | `GameState` | HUD |
| `LIFE_LOST` | `'life_lost'` | — | `Ball` / `GameScene` | `GameState` |
| `GAME_OVER` | `'game_over'` | `{ score: number }` | `GameState` | `GameScene` |
| `BALL_CEILING_HIT` | `'ball_ceiling_hit'` | — | `Ball` | `Paddle` (stretch goal) |
