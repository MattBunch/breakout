export const SceneKeys = {
  PRELOADER: 'PRELOADER',
  MAIN_MENU: 'MAIN_MENU',
  GAME: 'GAME',
  HUD: 'HUD',
  GAME_OVER: 'GAME_OVER',
  LEVEL_CLEAR: 'LEVEL_CLEAR',
} as const;

export type SceneKey = (typeof SceneKeys)[keyof typeof SceneKeys];
