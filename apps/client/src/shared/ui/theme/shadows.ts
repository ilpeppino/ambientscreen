import type { ViewStyle } from "react-native";
import { colors } from "./colors";

export const shadows = {
  none: {} as ViewStyle,
  subtle: {
    boxShadow: "0px 2px 6px rgba(0, 0, 0, 0.16)",
    elevation: 2,
  } as ViewStyle,
  selected: {
    boxShadow: `0px 0px 10px ${colors.accentBlue}`,
    elevation: 6,
  } as ViewStyle,
} as const;

export type ShadowToken = keyof typeof shadows;
