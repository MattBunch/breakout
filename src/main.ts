import { Game, AUTO } from 'phaser';
import { PreloaderScene } from './scenes/PreloaderScene';
import { GameScene } from './scenes/GameScene';
import { HudScene } from './scenes/HudScene';
import { GameOverScene } from './scenes/GameOverScene';
import { Balance } from './config/Balance';

new Game({
  type: AUTO,
  width: Balance.CANVAS_WIDTH,
  height: Balance.CANVAS_HEIGHT,
  backgroundColor: '#000000',
  physics: {
    default: 'arcade',
    arcade: { gravity: { x: 0, y: 0 }, debug: false },
  },
  scene: [PreloaderScene, GameScene, HudScene, GameOverScene],
});
