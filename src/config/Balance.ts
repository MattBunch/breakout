export const Balance = {
  // Canvas
  CANVAS_WIDTH: 480,
  CANVAS_HEIGHT: 640,

  // Ball
  BALL_SPEED_INITIAL: 300,
  BALL_SPEED_INCREMENT: 10,
  BALL_SPEED_MAX: 700,
  BALL_SIZE: 12,

  // Paddle
  PADDLE_WIDTH_NORMAL: 100,
  PADDLE_WIDTH_NARROW: 60,
  PADDLE_HEIGHT: 14,
  PADDLE_SPEED: 500,
  PADDLE_Y_OFFSET: 40,

  // Bricks
  BRICK_ROWS: 8,
  BRICK_COLS: 14,
  BRICK_WIDTH: 28,
  BRICK_HEIGHT: 16,
  BRICK_PADDING: 4,
  BRICK_OFFSET_TOP: 80,
  BRICK_OFFSET_LEFT: 10,
  BRICK_SCORE_DEFAULT: 1,

  // Lives
  LIVES_START: 3,

  // Row scores (top to bottom)
  ROW_SCORES: [7, 7, 5, 5, 3, 3, 1, 1] as number[],

  // Row colours (Phaser 4 hex values, top to bottom)
  ROW_COLORS: [
    0xff4444, 0xff4444,
    0xff8800, 0xff8800,
    0x44dd44, 0x44dd44,
    0xffdd00, 0xffdd00,
  ] as number[],

  // Wall / ceiling visual thickness
  WALL_THICKNESS: 8,
} as const;
