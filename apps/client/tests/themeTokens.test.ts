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
  });
});

test("exports radius tokens", () => {
  expect(radius).toEqual({
    sm: 8,
    md: 12,
    lg: 16,
  });
});

test("exports core color tokens", () => {
  expect(colors.backgroundPrimary).toBe("#000000");
  expect(colors.surface).toBe("#1C1C1C");
  expect(colors.textPrimary).toBe("#FFFFFF");
  expect(colors.textSecondary).toBe("#9A9A9A");
  expect(colors.error).toBe("#FF6B6B");
});

test("exports typography variants", () => {
  expect(typography.title).toEqual({ fontSize: 30, fontWeight: "700" });
  expect(typography.subtitle).toEqual({ fontSize: 18, fontWeight: "600" });
  expect(typography.body).toEqual({ fontSize: 16, fontWeight: "400" });
  expect(typography.caption).toEqual({ fontSize: 12, fontWeight: "400" });
});

test("exports motion durations", () => {
  expect(motion.fast).toBe(150);
  expect(motion.normal).toBe(250);
  expect(motion.slow).toBe(400);
});
