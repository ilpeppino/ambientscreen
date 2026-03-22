import { describe, expect, test } from "vitest";
import { colors } from "../src/shared/ui/theme";
import {
  getIconColor,
  getIconSize,
  ICON_SIZES,
} from "../src/shared/ui/components/appIconTokens";

describe("AppIcon mapping", () => {
  test("maps size tokens to numeric values", () => {
    expect(getIconSize("sm")).toBe(ICON_SIZES.sm);
    expect(getIconSize("md")).toBe(ICON_SIZES.md);
    expect(getIconSize("lg")).toBe(ICON_SIZES.lg);
    expect(getIconSize("xl")).toBe(ICON_SIZES.xl);
  });

  test("maps color tokens to theme colors", () => {
    expect(getIconColor("textPrimary")).toBe(colors.textPrimary);
    expect(getIconColor("textSecondary")).toBe(colors.textSecondary);
    expect(getIconColor("accent")).toBe(colors.accent);
    expect(getIconColor("error")).toBe(colors.error);
  });
});
