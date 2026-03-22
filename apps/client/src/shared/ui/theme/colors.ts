export const colors = {
  backgroundPrimary: "#000000",
  surface: "#1C1C1C",
  textPrimary: "#FFFFFF",
  textSecondary: "#9A9A9A",
  error: "#FF6B6B",
  accent: "#F5A623",
} as const;

export type ColorToken = keyof typeof colors;
