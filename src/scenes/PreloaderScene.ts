import { Scene } from 'phaser';
import { SceneKeys } from '../config/SceneKeys';
import { AssetKeys } from '../config/AssetKeys';
import { Balance } from '../config/Balance';

export const PreloaderScene: any = {
  key: SceneKeys.PRELOADER,

  preload() {},

  create() {
    const self = this as any;
    generateBallTexture(self);
    generatePaddleTexture(self);
    generateBrickTexture(self);
    self.scene.start(SceneKeys.GAME);
  },
};

function generateBallTexture(scene: Scene): void {
  const size = Balance.BALL_SIZE;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, size, size);
  g.generateTexture(AssetKeys.BALL, size, size);
  g.destroy();
}

function generatePaddleTexture(scene: Scene): void {
  const w = Balance.PADDLE_WIDTH_NORMAL;
  const h = Balance.PADDLE_HEIGHT;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, w, h);
  g.generateTexture(AssetKeys.PADDLE, w, h);
  g.destroy();
}

function generateBrickTexture(scene: Scene): void {
  const w = Balance.BRICK_WIDTH;
  const h = Balance.BRICK_HEIGHT;
  const g = scene.add.graphics();
  g.fillStyle(0xffffff, 1);
  g.fillRect(0, 0, w, h);
  g.fillStyle(0x000000, 0.25);
  g.fillRect(w - 2, 0, 2, h);
  g.fillRect(0, h - 2, w, 2);
  g.generateTexture(AssetKeys.BRICK, w, h);
  g.destroy();
}
