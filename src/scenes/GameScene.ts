/**
 * GameScene.ts — Core gameplay scene.
 *
 * Step 3 additions:
 *   - Ball entity created above the paddle
 *   - ArcadePhysics collider registered between ball and paddle
 *   - LIFE_LOST handler resets ball and paddle
 *   - GAME_OVER handler transitions to GameOverScene (stubbed)
 *   - ball.update(delta) called each frame
 */
import { SceneKeys } from '../config/SceneKeys';
import { Balance } from '../config/Balance';
import { Paddle } from '../entities/Paddle';
import { Ball } from '../entities/Ball';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';

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

    gameState.reset();

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

    // Entities
    self.paddle = new Paddle(self);
    self.ball = new Ball(self, self.paddle.getX(), self.paddle.getY());

    // Paddle ↔ Ball collider
    self.physics.add.collider(
      self.ball.getSprite(),
      self.paddle.getSprite(),
      () => {
        onBallHitPaddle(self.ball, self.paddle);
      },
    );

    // Life lost — reset ball and paddle
    EventBus.on(Events.LIFE_LOST, () => {
      if (gameState.getLives() > 0) {
        self.paddle.resetToCenter(width);
        self.ball.resetToPaddle(self.paddle.getX(), self.paddle.getY());
      }
    });

    // Game over — transition scene
    EventBus.on(Events.GAME_OVER, () => {
      // GameOverScene is not yet built — restart game for now
      self.scene.restart();
    });

    // Clean up EventBus listeners when this scene shuts down
    self.events.on('shutdown', () => {
      EventBus.off(Events.LIFE_LOST);
      EventBus.off(Events.GAME_OVER);
    });

    // HUD runs in parallel
    self.scene.launch(SceneKeys.HUD);
  },

  update(_time: number, delta: number) {
    const self = this as any;
    self.paddle.update(delta);
    self.ball.update(delta);
  },
};

// ---------------------------------------------------------------------------
// Collision handler — minimum work only (see AGENTS.md collision guidelines)
// ---------------------------------------------------------------------------

/**
 * Applies paddle-angle influence: the ball's horizontal velocity is biased
 * by how far from centre it struck the paddle. Hitting the left edge sends
 * it further left; hitting the right edge sends it further right.
 * Vertical speed magnitude is preserved.
 */
function onBallHitPaddle(ball: Ball, paddle: Paddle): void {
  const ballX = ball.getSprite().x;
  const paddleX = paddle.getX();
  const halfWidth = paddle.getWidth() / 2;

  // Normalised hit position: -1 (far left) to +1 (far right)
  const hitPos = Math.max(-1, Math.min(1, (ballX - paddleX) / halfWidth));

  const speed = gameState.getBallSpeed();
  const maxAngleRad = (70 * Math.PI) / 180; // max 70° from vertical
  const angle = hitPos * maxAngleRad;

  ball.getSprite().setVelocity(
    Math.sin(angle) * speed,
    -Math.abs(Math.cos(angle) * speed), // always send upward
  );
}
