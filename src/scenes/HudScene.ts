/**
 * HudScene.ts — Parallel overlay scene showing score, lives, high score.
 *
 * Listens to EventBus events from GameState. Never reads game state
 * directly — all values arrive via event payloads.
 */
import { SceneKeys } from '../config/SceneKeys';
import { EventBus } from '../systems/EventBus';
import { Events } from '../config/Events';
import { gameState } from '../systems/GameState';
import { Balance } from '../config/Balance';

const TEXT_STYLE = {
  fontSize: '14px',
  color: '#ffffff',
  fontFamily: 'monospace',
};

const HUD_Y = 20;

export const HudScene: any = {
  key: SceneKeys.HUD,

  create() {
    const self = this as any;
    const { width } = self.sys.game.config as { width: number };

    const scoreText = self.add
      .text(Balance.WALL_THICKNESS + 8, HUD_Y, formatScore(0), TEXT_STYLE)
      .setOrigin(0, 0.5)
      .setDepth(10);

    const livesText = self.add
      .text(width / 2, HUD_Y, formatLives(Balance.LIVES_START), TEXT_STYLE)
      .setOrigin(0.5, 0.5)
      .setDepth(10);

    const hiText = self.add
      .text(
        width - Balance.WALL_THICKNESS - 8,
        HUD_Y,
        formatHiScore(gameState.getHighScore()),
        TEXT_STYLE,
      )
      .setOrigin(1, 0.5)
      .setDepth(10);

    // Score changed — update score and hi score display
    const onScoreChanged = ({
      score,
      highScore,
    }: {
      score: number;
      highScore: number;
    }) => {
      scoreText.setText(formatScore(score));
      hiText.setText(formatHiScore(highScore));
    };

    // Life lost — update lives display
    const onLifeLost = () => {
      livesText.setText(formatLives(gameState.getLives()));
    };

    // Game over — ensure hi score is up to date in the display
    const onGameOver = ({ highScore }: { highScore: number }) => {
      hiText.setText(formatHiScore(highScore));
    };

    EventBus.on(Events.SCORE_CHANGED, onScoreChanged);
    EventBus.on(Events.LIFE_LOST, onLifeLost);
    EventBus.on(Events.GAME_OVER, onGameOver);

    // Remove named listeners on shutdown to prevent accumulation
    self.events.on('shutdown', () => {
      EventBus.off(Events.SCORE_CHANGED, onScoreChanged);
      EventBus.off(Events.LIFE_LOST, onLifeLost);
      EventBus.off(Events.GAME_OVER, onGameOver);
    });
  },
};

// ---------------------------------------------------------------------------
// Formatters
// ---------------------------------------------------------------------------

function formatScore(score: number): string {
  return `SCORE: ${String(score).padStart(4, '0')}`;
}

function formatLives(lives: number): string {
  return `LIVES: ${'❤'.repeat(Math.max(0, lives))}`;
}

function formatHiScore(hi: number): string {
  return `HI: ${String(hi).padStart(4, '0')}`;
}
