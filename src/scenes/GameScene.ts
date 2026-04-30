/**
 * GameScene.ts — Core gameplay scene.
 *
 * Step 5 additions:
 *   - gameState.init() called on first create to load persisted high score
 *   - GAME_OVER handler now transitions to GameOverScene
 */
import { SceneKeys } from '../config/SceneKeys';
import { Balance } from '../config/Balance';
import { Paddle } from '../entities/Paddle';
import { Ball } from '../entities/Ball';
import { BrickGrid, BRICK_ROW_DATA_KEY } from '../entities/BrickGrid';
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

    const finishCreate = () => {
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
      self.brickGrid = new BrickGrid(self);

      // Ball ↔ Paddle collider
      self.physics.add.collider(
        self.ball.getSprite(),
        self.paddle.getSprite(),
        () => { onBallHitPaddle(self.ball, self.paddle); },
      );

      // Ball ↔ Brick collider
      self.physics.add.collider(
        self.ball.getSprite(),
        self.brickGrid.getGroup(),
        (_ball: any, brick: any) => {
          onBallHitBrick(brick, self.brickGrid);
        },
      );

      // EventBus listeners — named so shutdown can remove them precisely
      const onBrickDestroyed = ({ rowIndex }: { rowIndex: number }) => {
        gameState.onBrickDestroyed(rowIndex);
        self.ball.incrementSpeed();
      };

      const onLifeLost = () => {
        gameState.onLifeLost();
        if (gameState.getLives() > 0) {
          self.paddle.resetToCenter(width);
          self.ball.resetToPaddle(self.paddle.getX(), self.paddle.getY());
        }
      };

      const onGameOver = () => {
        self.brickGrid.destroy();
        self.scene.stop(SceneKeys.HUD);
        self.scene.start(SceneKeys.GAME_OVER);
      };

      EventBus.on(Events.BRICK_DESTROYED, onBrickDestroyed);
      EventBus.on(Events.LIFE_LOST, onLifeLost);
      EventBus.on(Events.GAME_OVER, onGameOver);

      self.events.on('shutdown', () => {
        EventBus.off(Events.BRICK_DESTROYED, onBrickDestroyed);
        EventBus.off(Events.LIFE_LOST, onLifeLost);
        EventBus.off(Events.GAME_OVER, onGameOver);
      });

      self.scene.launch(SceneKeys.HUD);
    };

    // Only load from Platform on the very first create.
    // After that the singleton retains the high score in memory.
    if (!self.initialised) {
      self.initialised = true;
      gameState.init().then(finishCreate);
    } else {
      finishCreate();
    }
  },

  update(_time: number, delta: number) {
    const self = this as any;
    if (self.paddle) {
      self.paddle.update(delta);
    }
    if (self.ball) {
      self.ball.update(delta);
    }
  },
};

function onBallHitBrick(
  brick: any,
  brickGrid: BrickGrid,
): void {
  const rowIndex = brick.getData(BRICK_ROW_DATA_KEY);

  brick.destroy();
  brickGrid.decrementRemaining();
  EventBus.emit(Events.BRICK_DESTROYED, { rowIndex });

  if (brickGrid.getRemainingCount() <= 0) {
    EventBus.emit(Events.LEVEL_CLEAR);
  }
}

function onBallHitPaddle(ball: Ball, paddle: Paddle): void {
  const ballX = ball.getSprite().x;
  const paddleX = paddle.getX();
  const halfWidth = paddle.getWidth() / 2;
  const hitPos = Math.max(-1, Math.min(1, (ballX - paddleX) / halfWidth));
  const speed = gameState.getBallSpeed();
  const maxAngleRad = (70 * Math.PI) / 180;
  const angle = hitPos * maxAngleRad;

  ball.getSprite().setVelocity(
    Math.sin(angle) * speed,
    -Math.abs(Math.cos(angle) * speed),
  );
}
