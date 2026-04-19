import { SceneKeys } from '../config/SceneKeys';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';

export const HudScene: any = {
  key: SceneKeys.HUD,

  create() {
    const self = this as any;
    const { width } = self.sys.game.config as { width: number };

    const scoreText = self.add.text(16, 16, 'SCORE: 0', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    });

    const livesText = self.add.text(width / 2, 16, 'LIVES: 3', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5, 0);

    const hiText = self.add.text(width - 16, 16, 'HI: 0', {
      fontSize: '16px',
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(1, 0);

    EventBus.on(Events.SCORE_CHANGED, ({ score }: { score: number }) => {
      scoreText.setText(`SCORE: ${score}`);
      hiText.setText(`HI: ${gameState.getHighScore()}`);
    });

    EventBus.on(Events.LIFE_LOST, () => {
      livesText.setText(`LIVES: ${gameState.getLives()}`);
    });

    EventBus.on(Events.GAME_OVER, () => {
      hiText.setText(`HI: ${gameState.getHighScore()}`);
    });

    self.events.on('shutdown', () => {
      EventBus.off(Events.SCORE_CHANGED);
      EventBus.off(Events.LIFE_LOST);
      EventBus.off(Events.GAME_OVER);
    });
  },
};
