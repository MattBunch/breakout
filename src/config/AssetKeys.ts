export const AssetKeys = {
  BALL: 'ball',
  PADDLE: 'paddle',
  BRICK: 'brick',
} as const;

export type AssetKey = (typeof AssetKeys)[keyof typeof AssetKeys];
