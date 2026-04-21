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
import { Scene, Input, Physics } from 'phaser';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';

/** Minimum launch angle offset from vertical, in degrees. */
const LAUNCH_ANGLE_VARIANCE = 30;

export class Ball {
  private sprite: Physics.Arcade.Sprite;
  private isLive: boolean = false;
  private hasHitCeiling: boolean = false;
  private launchKey!: Input.Keyboard.Key;
  private sceneHeight: number;

  constructor(scene: Scene, paddleX: number, paddleY: number) {
    const { height } = scene.sys.game.config as {
      height: number;
    };
    this.sceneHeight = height as number;

    const physics = (scene as any).physics as Physics.Arcade.ArcadePhysics;
    this.sprite = physics.add.sprite(
      paddleX,
      paddleY - Balance.PADDLE_HEIGHT / 2 - Balance.BALL_SIZE / 2 - 1,
      AssetKeys.BALL,
    );

    this.sprite.setBounce(1, 1);
    this.sprite.setCollideWorldBounds(true);
    this.sprite.setDisplaySize(Balance.BALL_SIZE, Balance.BALL_SIZE);

    // Space bar to launch
    this.launchKey = scene.input.keyboard!.addKey(
      Input.Keyboard.KeyCodes.SPACE,
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

  getSprite(): Physics.Arcade.Sprite {
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
    const body = this.sprite.body as Physics.Arcade.Body;
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
      if (Input.Keyboard.JustDown(this.launchKey)) {
        this.launch();
      }
      return;
    }

    // Ceiling detection — emit once per life
    const body = this.sprite.body as Physics.Arcade.Body;
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
