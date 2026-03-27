import { expect, test, describe } from "vitest";
import { deriveWidgetRenderContext, deriveWidgetVisualScale, computeRenderTokens } from "../src/widgets/shared/widgetRenderContext";
import { computeLayoutFrame, DISPLAY_GRID_COLUMNS, DISPLAY_GRID_BASE_ROWS } from "../src/features/display/components/LayoutGrid.logic";

test("render context derives fullscreen tier from actual bounds occupancy", () => {
  const compact = deriveWidgetRenderContext({
    viewportWidth: 1280,
    viewportHeight: 720,
    widgetWidth: 280,
    widgetHeight: 160,
    platform: "web",
  });

  const fullscreen = deriveWidgetRenderContext({
    viewportWidth: 1280,
    viewportHeight: 720,
    widgetWidth: 1280,
    widgetHeight: 720,
    platform: "web",
  });

  expect(compact.sizeTier).toBe("compact");
  expect(fullscreen.sizeTier).toBe("fullscreen");
  expect(fullscreen.isFullscreen).toBe(true);
});

test("full-canvas SlideItem bounds produce fullscreen render context via layout frame", () => {
  const containerWidth = 1280;
  const containerHeight = 720;

  // A widget with layout filling all 12 columns and 6 rows (full canvas)
  const frame = computeLayoutFrame({
    layout: { x: 0, y: 0, w: DISPLAY_GRID_COLUMNS, h: DISPLAY_GRID_BASE_ROWS },
    containerWidth,
    containerHeight,
  });

  const ctx = deriveWidgetRenderContext({
    viewportWidth: containerWidth,
    viewportHeight: containerHeight,
    widgetWidth: frame.width,
    widgetHeight: frame.height,
    platform: "web",
  });

  expect(frame.width).toBe(containerWidth);
  expect(frame.height).toBe(containerHeight);
  expect(ctx.sizeTier).toBe("fullscreen");
  expect(ctx.isFullscreen).toBe(true);
});

test("visual scale increases between compact and fullscreen", () => {
  const compactContext = deriveWidgetRenderContext({
    viewportWidth: 1280,
    viewportHeight: 720,
    widgetWidth: 260,
    widgetHeight: 180,
    platform: "web",
  });
  const fullscreenContext = deriveWidgetRenderContext({
    viewportWidth: 1280,
    viewportHeight: 720,
    widgetWidth: 1280,
    widgetHeight: 720,
    platform: "ios",
    safeAreaInsets: { top: 44, bottom: 34, left: 0, right: 0 },
  });

  const compactScale = deriveWidgetVisualScale(compactContext);
  const fullscreenScale = deriveWidgetVisualScale(fullscreenContext);

  expect(fullscreenScale.typographyScale).toBeGreaterThan(compactScale.typographyScale);
  expect(fullscreenScale.iconScale).toBeGreaterThan(compactScale.iconScale);
  expect(fullscreenScale.spacingScale).toBeGreaterThan(compactScale.spacingScale);
});

describe("canonical size tier classification", () => {
  test("compact tier for small widgets", () => {
    const ctx = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: 720,
      widgetWidth: 200,
      widgetHeight: 120,
      platform: "web",
    });
    expect(ctx.sizeTier).toBe("compact");
    expect(ctx.isFullscreen).toBe(false);
  });

  test("regular tier for medium widgets", () => {
    const ctx = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: 720,
      widgetWidth: 480,
      widgetHeight: 220,
      platform: "web",
    });
    expect(ctx.sizeTier).toBe("regular");
    expect(ctx.isFullscreen).toBe(false);
  });

  test("large tier for large non-fullscreen widgets", () => {
    // 50 % width × 60 % height → areaRatio ≈ 0.30 → large
    const ctx = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: 720,
      widgetWidth: 640,
      widgetHeight: 432,
      platform: "web",
    });
    expect(ctx.sizeTier).toBe("large");
    expect(ctx.isFullscreen).toBe(false);
  });

  test("fullscreen tier is only for widgets at ≥ 98 % of viewport in both dimensions", () => {
    // Slightly less than full → large, not fullscreen
    const almostFull = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: 720,
      widgetWidth: 1260,
      widgetHeight: 700,
      platform: "web",
    });
    expect(almostFull.sizeTier).toBe("large");
    expect(almostFull.isFullscreen).toBe(false);

    // Exactly full → fullscreen
    const full = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: 720,
      widgetWidth: 1280,
      widgetHeight: 720,
      platform: "web",
    });
    expect(full.sizeTier).toBe("fullscreen");
    expect(full.isFullscreen).toBe(true);
  });

  test("no hero tier exists — formerly-hero-range widgets resolve to large", () => {
    // Old "hero" threshold: areaRatio >= 0.46 → now maps to large
    const ctx = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: 720,
      widgetWidth: 1000,
      widgetHeight: 400, // ~0.434 area ratio — within the old hero range
      platform: "web",
    });
    expect(ctx.sizeTier).toBe("large");
  });
});

describe("computeRenderTokens", () => {
  test("fullscreen tokens are proportional to widget height", () => {
    const h = 720;
    const ctx = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: h,
      widgetWidth: 1280,
      widgetHeight: h,
      platform: "web",
    });
    const tokens = computeRenderTokens(ctx);

    expect(tokens.heroFontSize).toBe(Math.round(h * 0.30));
    expect(tokens.titleFontSize).toBe(Math.round(h * 0.050));
    expect(tokens.bodyFontSize).toBe(Math.round(h * 0.040));
    expect(tokens.metaFontSize).toBe(Math.round(h * 0.028));
    expect(tokens.heroSupportGap).toBe(Math.round(h * 0.065));
    expect(tokens.supportDetailGap).toBe(Math.round(h * 0.045));
    expect(tokens.iconSize).toBe("xl");
  });

  test("fullscreen tokens scale together with different widget heights", () => {
    function tokensForHeight(h: number) {
      const ctx = deriveWidgetRenderContext({
        viewportWidth: 1280,
        viewportHeight: h,
        widgetWidth: 1280,
        widgetHeight: h,
        platform: "web",
      });
      return computeRenderTokens(ctx);
    }

    const small = tokensForHeight(480);
    const large = tokensForHeight(960);

    expect(large.heroFontSize).toBeGreaterThan(small.heroFontSize);
    expect(large.heroSupportGap).toBeGreaterThan(small.heroSupportGap);
    expect(large.supportDetailGap).toBeGreaterThan(small.supportDetailGap);
    expect(large.bodyFontSize).toBeGreaterThan(small.bodyFontSize);
  });

  test("compact tokens are smaller than regular tokens", () => {
    function tokensForTierContext(w: number, h: number) {
      const ctx = deriveWidgetRenderContext({
        viewportWidth: 1280,
        viewportHeight: 720,
        widgetWidth: w,
        widgetHeight: h,
        platform: "web",
      });
      return computeRenderTokens(ctx);
    }

    const compact = tokensForTierContext(200, 120);
    const regular = tokensForTierContext(480, 220);

    expect(regular.heroFontSize).toBeGreaterThan(compact.heroFontSize);
    expect(regular.heroSupportGap).toBeGreaterThan(compact.heroSupportGap);
  });

  test("fullscreen icon size is xl", () => {
    const ctx = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: 720,
      widgetWidth: 1280,
      widgetHeight: 720,
      platform: "web",
    });
    expect(computeRenderTokens(ctx).iconSize).toBe("xl");
  });

  test("compact icon size is md", () => {
    const ctx = deriveWidgetRenderContext({
      viewportWidth: 1280,
      viewportHeight: 720,
      widgetWidth: 200,
      widgetHeight: 120,
      platform: "web",
    });
    expect(computeRenderTokens(ctx).iconSize).toBe("md");
  });
});
