export const motion = {
  fast: 150,
  normal: 250,
  slow: 400,
} as const;

export type MotionToken = keyof typeof motion;
