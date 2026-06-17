# Breakout

Breakout is an arcade ball-and-paddle game built with Phaser 4, TypeScript, Vite, and Tauri 2. It targets both the browser and desktop builds for Windows, macOS, and Linux.

The player controls a paddle at the bottom of the playfield, keeps the ball in play, and clears brick rows for points. The current implementation includes core Breakout gameplay, scoring, lives, a HUD, game-over flow, and platform-backed high score persistence.

## Tech Stack

- Phaser 4 for game rendering and arcade physics
- TypeScript for game code
- Vite for browser development and builds
- Tauri 2 for desktop development and packaging
- Vitest for unit tests

## Project Structure

```text
src/
  scenes/      Phaser scene objects
  entities/    Ball, paddle, brick grid, and other game objects
  systems/     Shared game state, platform, debug, and event bus logic
  config/      Asset keys, scene keys, events, balance values, and Tauri commands
  test/        Test mocks and helpers
public/        Static browser assets
src-tauri/     Tauri desktop wrapper and Rust entrypoints
```

## Prerequisites

- Node.js and npm
- Rust stable toolchain, required only for Tauri desktop commands

Install dependencies:

```bash
npm install
```

## Run in the Browser

Start the Vite dev server:

```bash
npm run dev
```

Vite prints the local URL when the server starts, typically `http://localhost:5173`.

Build the browser version:

```bash
npm run build
```

Preview the production build:

```bash
npm run preview
```

## Run as a Desktop App

Start the Tauri development app:

```bash
npm run tauri:dev
```

Build desktop installers:

```bash
npm run tauri:build
```

Tauri commands require the Rust toolchain and any system dependencies required by Tauri for your operating system.

## Validation

Type-check the project:

```bash
npm run typecheck
```

Run the test suite:

```bash
npm run test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate a coverage report:

```bash
npm run test:coverage
```

## Development Notes

- This project uses Phaser 4 modular imports, not the Phaser 3 global or monolithic import style.
- Scenes are functional scene objects in `src/scenes/`, not class-based `Phaser.Scene` subclasses.
- Game code in `src/` should be TypeScript.
- Shared constants belong in `src/config/`.
- Platform-specific behavior should go through `src/systems/Platform.ts`.
- Avoid changing `src-tauri/` unless the task specifically requires native desktop behavior.
