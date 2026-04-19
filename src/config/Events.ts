export const Events = {
  BRICK_DESTROYED: 'brick_destroyed',
  SCORE_CHANGED: 'score_changed',
  LIFE_LOST: 'life_lost',
  GAME_OVER: 'game_over',
  BALL_CEILING_HIT: 'ball_ceiling_hit',
  BALL_RESET: 'ball_reset',
} as const;

export type EventKey = (typeof Events)[keyof typeof Events];
