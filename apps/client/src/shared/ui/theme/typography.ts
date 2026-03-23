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
  small: { fontSize: 13, fontWeight: "400" },    // secondary/meta text
  label: { fontSize: 14, fontWeight: "400" },     // input/label text
  heading: { fontSize: 17, fontWeight: "700" },   // section headers/titles
  badge: { fontSize: 12, fontWeight: "700" },     // badge labels (same size as caption, bold)
} as const satisfies Record<string, Pick<TextStyle, "fontSize" | "fontWeight">>;

export type TypographyToken = keyof typeof typography;
