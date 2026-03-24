export const colors = {
  backgroundPrimary: "#000000",
  surface: "#1C1C1C",
  textPrimary: "#FFFFFF",
  textSecondary: "#9A9A9A",
  error: "#FF6B6B",
  accent: "#F5A623",

  // Backgrounds
  backgroundScreen: "#090c13",      // main screen/page background

  // Surfaces
  surfaceCard: "#111317",           // card, panel, empty panel backgrounds
  surfaceInput: "#0f1318",          // text input/field backgrounds
  surfaceModal: "#111822",          // modal sheet backgrounds

  // Borders
  border: "#2a2d34",                // default border
  borderInput: "#2e3440",           // input/field border

  // Interactive
  accentBlue: "#2d8cff",            // primary blue interactive

  // Button tones
  buttonSecondaryBg: "#162033",
  buttonSecondaryBorder: "#2a4a70",
  buttonSecondaryText: "#dbeafe",
  buttonPassiveBg: "#121212",
  buttonPassiveBorder: "#303030",
  buttonPassiveText: "#c9c9c9",

  // Status: success
  statusSuccessBg: "#0f2a1d",
  statusSuccessBorder: "#1f5e42",
  statusSuccessText: "#86efac",

  // Status: warning
  statusWarningBg: "#332508",
  statusWarningBorder: "#664d17",
  statusWarningText: "#f5d27a",

  // Status: danger
  statusDangerBg: "#301414",
  statusDangerBorder: "#5f2424",
  statusDangerBorderAlt: "#7f1d1d",   // destructive button border
  statusDangerText: "#fecaca",

  // Status: premium
  statusPremiumBg: "#2d250f",
  statusPremiumBorder: "#6b5318",

  // Status: info
  statusInfoBg: "#112239",
  statusInfoBorder: "#244e84",
  statusInfoText: "#93c5fd",

  // Status: neutral
  statusNeutralBg: "#111827",
  statusNeutralBorder: "#1f2937",

  // Auth screen (intentional light-theme departure for login/register)
  backgroundAuth: "#f3f4f6",
  surfaceAuth: "#ffffff",
  textOnLight: "#111827",
  borderLight: "#d1d5db",
  accentTeal: "#0f766e",
  errorStrong: "#dc2626",
} as const;

export type ColorToken = keyof typeof colors;
