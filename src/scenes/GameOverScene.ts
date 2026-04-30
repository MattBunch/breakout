/**
 * GameOverScene.ts — Shown when lives reach zero.
 * Displays final score and high score, prompts restart.
 */
import { SceneKeys } from '../config/SceneKeys';
import { gameState } from '../systems/GameState';

const TEXT_STYLE_LARGE = {
  fontSize: '32px',
  color: '#ffffff',
  fontFamily: 'monospace',
};

const TEXT_STYLE_SMALL = {
  fontSize: '16px',
  color: '#aaaaaa',
  fontFamily: 'monospace',
};

export const GameOverScene: any = {
  key: SceneKeys.GAME_OVER,

  create() {
    const self = this as any;
    const { width, height } = self.sys.game.config as {
      width: number;
      height: number;
    };

    const cx = (width as number) / 2;

    self.add
      .text(cx, (height as number) * 0.35, 'GAME OVER', TEXT_STYLE_LARGE)
      .setOrigin(0.5);

    self.add
      .text(
        cx,
        (height as number) * 0.48,
        `SCORE: ${String(gameState.getScore()).padStart(4, '0')}`,
        TEXT_STYLE_SMALL,
      )
      .setOrigin(0.5);

    self.add
      .text(
        cx,
        (height as number) * 0.55,
        `BEST:  ${String(gameState.getHighScore()).padStart(4, '0')}`,
        TEXT_STYLE_SMALL,
      )
      .setOrigin(0.5);

    const prompt = self.add
      .text(cx, (height as number) * 0.68, 'PRESS SPACE OR CLICK TO PLAY AGAIN', {
        fontSize: '12px',
        color: '#ffffff',
        fontFamily: 'monospace',
      })
      .setOrigin(0.5);

    // Blink the prompt
    self.time.addEvent({
      delay: 500,
      loop: true,
      callback: () => {
        prompt.setVisible(!prompt.visible);
      },
    });

    // Restart on Space
    self.input.keyboard!.once('keydown-SPACE', () => {
      self.scene.stop(SceneKeys.HUD);
      self.scene.start(SceneKeys.GAME);
    });

    // Restart on click or tap
    self.input.once('pointerdown', () => {
      self.scene.stop(SceneKeys.HUD);
      self.scene.start(SceneKeys.GAME);
    });
  },
};
