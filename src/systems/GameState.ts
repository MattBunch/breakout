import { EventBus } from './EventBus';
import { Events } from '../config/Events';
import { Balance } from '../config/Balance';

export class GameState {
  private score: number = 0;
  private lives: number = Balance.LIVES_START;
  private ballSpeed: number = Balance.BALL_SPEED_INITIAL;
  private highScore: number = 0;

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

    EventBus.emit(Events.SCORE_CHANGED, { score: this.score });
  }

  onLifeLost(): void {
    this.lives -= 1;

    if (this.lives <= 0) {
      this.lives = 0;
      if (this.score > this.highScore) {
        this.highScore = this.score;
      }
      EventBus.emit(Events.GAME_OVER, { score: this.score });
    }
  }
}

export const gameState = new GameState();
