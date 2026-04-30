/**
 * GameState.ts — Authoritative source for score, lives, ball speed,
 * and high score.
 *
 * High score is loaded from Platform on init() and saved to Platform
 * whenever it is beaten. All other mutations emit EventBus events.
 */
import { EventBus } from './EventBus';
import { Events } from '../config/Events';
import { Balance } from '../config/Balance';
import { Platform } from './Platform';

export class GameState {
  private score: number = 0;
  private lives: number = Balance.LIVES_START;
  private ballSpeed: number = Balance.BALL_SPEED_INITIAL;
  private highScore: number = 0;

  /**
   * Loads the persisted high score from Platform.
   * Must be called once at game startup before the first scene renders.
   * GameScene.create() awaits this via a one-time async prelude.
   */
  async init(): Promise<void> {
    this.highScore = await Platform.loadHighScore();
  }

  /**
   * Resets per-session state. Does NOT reset high score —
   * high score persists across sessions and is only updated on game over.
   */
  reset(): void {
    this.score = 0;
    this.lives = Balance.LIVES_START;
    this.ballSpeed = Balance.BALL_SPEED_INITIAL;
  }

  getScore(): number { return this.score; }
  getLives(): number { return this.lives; }
  getBallSpeed(): number { return this.ballSpeed; }
  getHighScore(): number { return this.highScore; }

  onBrickDestroyed(rowIndex: number): void {
    const points = Balance.ROW_SCORES[rowIndex] ?? Balance.BRICK_SCORE_DEFAULT;
    this.score += points;

    if (this.ballSpeed < Balance.BALL_SPEED_MAX) {
      this.ballSpeed = Math.min(
        this.ballSpeed + Balance.BALL_SPEED_INCREMENT,
        Balance.BALL_SPEED_MAX,
      );
    }

    EventBus.emit(Events.SCORE_CHANGED, { score: this.score, highScore: this.highScore });
  }

  onLifeLost(): void {
    this.lives -= 1;

    if (this.lives <= 0) {
      this.lives = 0;
      this.updateHighScore();
      EventBus.emit(Events.GAME_OVER, { score: this.score, highScore: this.highScore });
    } else {
      EventBus.emit(Events.LIFE_LOST);
    }
  }

  private updateHighScore(): void {
    if (this.score > this.highScore) {
      this.highScore = this.score;
      // Fire-and-forget — do not await, do not block game logic
      Platform.saveHighScore(this.highScore).catch(() => {
        // Save failed silently — high score is still correct in memory
      });
    }
  }
}

export const gameState = new GameState();
