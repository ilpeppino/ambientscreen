import { colors, type ColorToken } from "../theme";

export type AppIconSize = "sm" | "md" | "lg" | "xl";

export const ICON_SIZES: Record<AppIconSize, number> = {
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

export function getIconSize(size: AppIconSize): number {
  return ICON_SIZES[size];
}

export function getIconColor(color: ColorToken): string {
  return colors[color];
}
