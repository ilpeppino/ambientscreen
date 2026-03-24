import { expect, test } from "vitest";
import { ApiError } from "../src/core/http/api-error";
import {
  assertFeatureAccess,
  hasFeature,
  resolveUserFeatures,
} from "../src/modules/entitlements/entitlements.service";

test("hasFeature returns false for unknown feature keys", () => {
  const result = hasFeature(
    { plan: "pro" },
    "unknown-feature" as "premium_widgets",
  );

  expect(result).toBe(false);
});

test("hasFeature allows pro-only feature for pro users", () => {
  expect(hasFeature({ plan: "pro" }, "premium_widgets")).toBe(true);
});

test("hasFeature denies pro-only feature for free users", () => {
  expect(hasFeature({ plan: "free" }, "premium_widgets")).toBe(false);
});

test("hasFeature normalizes invalid plans to free", () => {
  expect(hasFeature({ plan: "enterprise" }, "advanced_layouts")).toBe(false);
});

test("hasFeature normalizes nullish and empty-like plan values to free", () => {
  expect(hasFeature({ plan: undefined as unknown as string }, "premium_widgets")).toBe(false);
  expect(hasFeature({ plan: null as unknown as string }, "premium_widgets")).toBe(false);
  expect(hasFeature({ plan: "" }, "premium_widgets")).toBe(false);
  expect(hasFeature({ plan: 123 as unknown as string }, "premium_widgets")).toBe(false);
  expect(hasFeature({ plan: { tier: "pro" } as unknown as string }, "premium_widgets")).toBe(false);
});

test("assertFeatureAccess does not throw when user has feature", () => {
  expect(() => assertFeatureAccess({ plan: "pro" }, "plugin_installation")).not.toThrow();
});

test("assertFeatureAccess throws forbidden ApiError when user lacks feature", () => {
  let thrown: unknown;

  try {
    assertFeatureAccess({ plan: "free" }, "plugin_installation");
  } catch (error) {
    thrown = error;
  }

  expect(thrown).toBeInstanceOf(ApiError);
  expect((thrown as ApiError).status).toBe(403);
  expect((thrown as ApiError).code).toBe("FORBIDDEN");
  expect((thrown as ApiError).message).toContain("Plugin Installation");
});

test("resolveUserFeatures returns full feature map for free users", () => {
  const resolved = resolveUserFeatures({ plan: "free" });

  expect(resolved).toEqual({
    premium_widgets: false,
    advanced_layouts: false,
    multi_device_control: false,
    plugin_installation: false,
  });
});

test("resolveUserFeatures returns full feature map for pro users", () => {
  const resolved = resolveUserFeatures({ plan: "pro" });

  expect(resolved).toEqual({
    premium_widgets: true,
    advanced_layouts: true,
    multi_device_control: true,
    plugin_installation: true,
  });
});
