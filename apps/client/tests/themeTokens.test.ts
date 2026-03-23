import { expect, test } from "vitest";
import { colors, motion, radius, spacing, typography } from "../src/shared/ui/theme";

test("exports spacing tokens", () => {
  expect(spacing).toEqual({
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
    xxl: 32,
    screenPadding: 20,
  });
});

test("exports radius tokens", () => {
  expect(radius).toEqual({
    sm: 8,
    md: 12,
    lg: 16,
    pill: 9999,
  });
});

test("exports core color tokens", () => {
  expect(colors.backgroundPrimary).toBe("#000000");
  expect(colors.surface).toBe("#1C1C1C");
  expect(colors.textPrimary).toBe("#FFFFFF");
  expect(colors.textSecondary).toBe("#9A9A9A");
  expect(colors.error).toBe("#FF6B6B");
  expect(colors.accent).toBe("#F5A623");
});

test("exports extended color tokens", () => {
  expect(colors.backgroundScreen).toBe("#090c13");
  expect(colors.surfaceCard).toBe("#111317");
  expect(colors.surfaceInput).toBe("#0f1318");
  expect(colors.surfaceModal).toBe("#111822");
  expect(colors.border).toBe("#2a2d34");
  expect(colors.borderInput).toBe("#2e3440");
  expect(colors.accentBlue).toBe("#2d8cff");
  expect(colors.statusSuccessBg).toBe("#0f2a1d");
  expect(colors.statusDangerBg).toBe("#301414");
  expect(colors.statusWarningBg).toBe("#332508");
  expect(colors.statusInfoBg).toBe("#112239");
  expect(colors.statusPremiumBg).toBe("#2d250f");
  expect(colors.statusNeutralBg).toBe("#111827");
});

test("exports typography variants", () => {
  expect(typography.title).toEqual({ fontSize: 30, fontWeight: "700" });
  expect(typography.subtitle).toEqual({ fontSize: 18, fontWeight: "600" });
  expect(typography.body).toEqual({ fontSize: 16, fontWeight: "400" });
  expect(typography.caption).toEqual({ fontSize: 12, fontWeight: "400" });
  expect(typography.small).toEqual({ fontSize: 13, fontWeight: "400" });
  expect(typography.label).toEqual({ fontSize: 14, fontWeight: "400" });
  expect(typography.heading).toEqual({ fontSize: 17, fontWeight: "700" });
  expect(typography.badge).toEqual({ fontSize: 12, fontWeight: "700" });
});

test("exports motion durations", () => {
  expect(motion.fast).toBe(150);
  expect(motion.normal).toBe(250);
  expect(motion.slow).toBe(400);
});
