import type { TextStyle } from "react-native";

export const typography = {
  title: {
    fontSize: 30,
    fontWeight: "700",
  },
  subtitle: {
    fontSize: 18,
    fontWeight: "600",
  },
  body: {
    fontSize: 16,
    fontWeight: "400",
  },
  caption: {
    fontSize: 12,
    fontWeight: "400",
  },
} as const satisfies Record<string, Pick<TextStyle, "fontSize" | "fontWeight">>;

export type TypographyToken = keyof typeof typography;
