export const radius = {
  sm: 8,
  md: 12,
  lg: 16,
  pill: 9999,   // fully rounded pill shape (chips, tags)
} as const;

export type RadiusToken = keyof typeof radius;
