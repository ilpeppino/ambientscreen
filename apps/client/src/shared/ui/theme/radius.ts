export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
} as const;

export type RadiusToken = keyof typeof radius;
