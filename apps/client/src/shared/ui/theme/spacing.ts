export const spacing = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  xxl: 32,
  screenPadding: 20,   // standard screen horizontal padding
} as const;

export type SpacingToken = keyof typeof spacing;
