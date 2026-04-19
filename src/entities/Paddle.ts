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
import { Scene, Input, Physics } from 'phaser';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';

export class Paddle {
  private sprite: Physics.Arcade.Sprite;
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private wasd!: {
    left: Input.Keyboard.Key;
    right: Input.Keyboard.Key;
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

    // scene.physics is available on Scene at runtime.
    // Cast to any to access Arcade Physics factory since we don't have a better type for functional scenes.
    const physics = (scene as any).physics as Physics.Arcade.ArcadePhysics;
    this.sprite = physics.add.sprite(startX, startY, AssetKeys.PADDLE);
    
    this.sprite.setImmovable(true);
    this.sprite.setCollideWorldBounds(true);
    this.setWidth(Balance.PADDLE_WIDTH_NORMAL);

    // Keyboard input
    this.cursors = scene.input.keyboard!.createCursorKeys();
    this.wasd = scene.input.keyboard!.addKeys({
      left: Input.Keyboard.KeyCodes.A,
      right: Input.Keyboard.KeyCodes.D,
    }) as { left: Input.Keyboard.Key; right: Input.Keyboard.Key };

    // Mouse / touch input — follow pointer X
    scene.input.on('pointermove', (pointer: Input.Pointer) => {
      this.targetX = pointer.x;
      this.usingPointer = true;
    });

    // When keyboard is pressed, stop following pointer so keys take over
    scene.input.keyboard!.on('keydown', () => {
      this.usingPointer = false;
      this.targetX = null;
    });
  }

  getSprite(): Physics.Arcade.Sprite {
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
