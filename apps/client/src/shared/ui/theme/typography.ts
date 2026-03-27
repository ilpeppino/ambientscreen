import type { TextStyle } from "react-native";

type TypographyStyle = Pick<TextStyle, "fontSize" | "fontWeight" | "lineHeight">;

const semanticTypography = {
  displayLg: { fontSize: 108, fontWeight: "700", lineHeight: 108 },
  displayMd: { fontSize: 64, fontWeight: "700" },
  displaySm: { fontSize: 36, fontWeight: "700" },
  titleLg: { fontSize: 28, fontWeight: "700" },
  titleMd: { fontSize: 20, fontWeight: "600" },
  titleSm: { fontSize: 16, fontWeight: "600" },
  body: { fontSize: 14, fontWeight: "400", lineHeight: 20 },
  caption: { fontSize: 12, fontWeight: "400" },
  captionXs: { fontSize: 11, fontWeight: "400" },
  compactControl: { fontSize: 13, fontWeight: "400" },
} as const satisfies Record<string, TypographyStyle>;

export const typography = {
  ...semanticTypography,
  // Compatibility aliases while existing screens migrate to semantic names.
  title: semanticTypography.titleLg,
  subtitle: semanticTypography.titleSm,
  small: semanticTypography.caption,
  label: semanticTypography.body,
  heading: semanticTypography.titleSm,
  badge: { fontSize: semanticTypography.caption.fontSize, fontWeight: "700" as const },
} as const satisfies Record<string, TypographyStyle>;

export type TypographyToken = keyof typeof typography;
