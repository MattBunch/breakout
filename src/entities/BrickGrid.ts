/**
 * BrickGrid.ts — Spawns and manages the full brick field.
 *
 * Responsibilities:
 *   - Creates all bricks in a StaticGroup (bricks do not move)
 *   - Applies per-row tint using Phaser 4's TintModes.FILL
 *   - Stores each brick's row index on the game object so the collision
 *     callback can emit the correct row index with BRICK_DESTROYED
 *   - Exposes getGroup() so GameScene can register the collider
 *   - Exposes getRemainingCount() so GameScene can detect level clear
 *
 * What BrickGrid does NOT do:
 *   - Does not listen for or handle BRICK_DESTROYED itself
 *   - Does not update score, lives, or ball speed
 *   - Does not register its own collider — that is the scene's job
 */
import { Scene, TintModes, Physics } from 'phaser';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';

/** Key used to store the row index on each brick game object. */
export const BRICK_ROW_DATA_KEY = 'rowIndex';

export class BrickGrid {
  private group: Physics.Arcade.StaticGroup;
  private remainingCount: number = 0;

  constructor(scene: Scene) {
    const physics = (scene as any).physics as Physics.Arcade.ArcadePhysics;
    this.group = physics.add.staticGroup();
    this.spawnBricks(scene);
  }

  getGroup(): Physics.Arcade.StaticGroup {
    return this.group;
  }

  getRemainingCount(): number {
    return this.remainingCount;
  }

  decrementRemaining(): void {
    this.remainingCount -= 1;
  }

  destroy(): void {
    this.group.clear(true, true);
  }

  private spawnBricks(scene: Scene): void {
    const { width } = scene.sys.game.config as { width: number };
    const t = Balance.WALL_THICKNESS;

    // Calculate horizontal centering offset so the brick field
    // sits symmetrically within the play area walls.
    const playWidth = (width as number) - t * 2;
    const fieldWidth =
      Balance.BRICK_COLS * Balance.BRICK_WIDTH +
      (Balance.BRICK_COLS - 1) * Balance.BRICK_PADDING;
    const offsetLeft = t + Math.max(
      Balance.BRICK_OFFSET_LEFT,
      Math.floor((playWidth - fieldWidth) / 2),
    );

    for (let row = 0; row < Balance.BRICK_ROWS; row++) {
      const y =
        Balance.BRICK_OFFSET_TOP +
        row * (Balance.BRICK_HEIGHT + Balance.BRICK_PADDING) +
        Balance.BRICK_HEIGHT / 2;

      const color = Balance.ROW_COLORS[row] ?? 0xffffff;

      for (let col = 0; col < Balance.BRICK_COLS; col++) {
        const x =
          offsetLeft +
          col * (Balance.BRICK_WIDTH + Balance.BRICK_PADDING) +
          Balance.BRICK_WIDTH / 2;

        const brick = this.group.create(x, y, AssetKeys.BRICK) as
          any; // Cast to any to access setDisplaySize and setData without type conflict

        brick.setDisplaySize(Balance.BRICK_WIDTH, Balance.BRICK_HEIGHT);
        brick.setTint(color).setTintMode(TintModes.FILL);
        brick.setData(BRICK_ROW_DATA_KEY, row);

        this.remainingCount += 1;
      }
    }

    // Refresh static bodies after all bricks are placed.
    // Required in Phaser 4 after bulk-creating StaticGroup members.
    this.group.refresh();
  }
}
