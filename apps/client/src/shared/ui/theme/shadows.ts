import type { ViewStyle } from "react-native";
import { colors } from "./colors";

export const shadows = {
  none: {} as ViewStyle,
  subtle: {
    shadowColor: "#000000",
    shadowOpacity: 0.16,
    shadowRadius: 6,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    elevation: 2,
  } as ViewStyle,
  selected: {
    shadowColor: colors.accentBlue,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 6,
  } as ViewStyle,
} as const;

export type ShadowToken = keyof typeof shadows;
