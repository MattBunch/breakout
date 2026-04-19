/**
 * GameScene.ts — Core gameplay scene.
 *
 * Step 2 additions:
 *   - Paddle entity created and positioned
 *   - paddle.update(delta) called each frame
 */
import { SceneKeys } from '../config/SceneKeys';
import { Balance } from '../config/Balance';
import { Paddle } from '../entities/Paddle';

const WALL_COLOR = 0x8888ff;
const CEILING_COLOR = 0x8888ff;

export const GameScene: any = {
  key: SceneKeys.GAME,

  create() {
    const self = this as any;
    const { width, height } = self.sys.game.config as {
      width: number;
      height: number;
    };
    const t = Balance.WALL_THICKNESS;

    // World bounds — left/right/top solid, bottom open
    self.physics.world.setBounds(
      t, t, width - t * 2, height - t,
      true, true, true, false,
    );

    // Visual walls and ceiling
    const gfx = self.add.graphics();
    gfx.fillStyle(WALL_COLOR, 1);
    gfx.fillRect(0, 0, t, height);
    gfx.fillStyle(WALL_COLOR, 1);
    gfx.fillRect(width - t, 0, t, height);
    gfx.fillStyle(CEILING_COLOR, 1);
    gfx.fillRect(0, 0, width, t);

    // Paddle
    self.paddle = new Paddle(self);

    // HUD runs as a parallel scene
    self.scene.launch(SceneKeys.HUD);
  },

  update(_time: number, delta: number) {
    const self = this as any;
    self.paddle.update(delta);
  },
};
