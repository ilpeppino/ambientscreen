import type {
  WidgetRenderContext,
  WidgetRenderOrientation,
  WidgetRenderPlatform,
  WidgetRenderSizeTier,
} from "@ambient/shared-contracts";

interface DeriveWidgetRenderContextInput {
  viewportWidth: number;
  viewportHeight: number;
  widgetWidth: number;
  widgetHeight: number;
  platform: WidgetRenderPlatform;
  safeAreaInsets?: {
    top?: number;
    right?: number;
    bottom?: number;
    left?: number;
  };
}

export interface WidgetVisualScale {
  sizeTier: WidgetRenderSizeTier;
  typographyScale: number;
  iconScale: number;
  spacingScale: number;
  density: "compact" | "balanced" | "relaxed";
  framePadding: number;
  contentGap: number;
}

/**
 * Canonical rendering tokens derived from the render context.
 * Implements the three-region (Hero / Support / Detail) composition model
 * defined in docs/canonical/render-architecture.md.
 *
 * Fullscreen tokens are height-proportional so typography, iconography, and
 * spacing all scale together at the same rate.
 */
export interface WidgetRenderTokens {
  /** Primary value font size: time, temperature, first event title. */
  heroFontSize: number;
  /** Secondary emphasis font size: weekday label, condition label. */
  titleFontSize: number;
  /** Main content font size: date, location, event time. */
  bodyFontSize: number;
  /** Minor information font size: forecast slot text, +N more label. */
  metaFontSize: number;
  /** Vertical breathing room between the hero region and the support region. */
  heroSupportGap: number;
  /** Vertical spacing between the support region and the detail region. */
  supportDetailGap: number;
  /** Gap between items within a single region. */
  itemGap: number;
  /** AppIcon size tier. */
  iconSize: "sm" | "md" | "lg" | "xl";
}

export interface WidgetRegionHeights {
  hero: number;
  support: number;
  detail: number;
}

interface FitTextToRegionInput {
  targetFontSize: number;
  regionHeight: number;
  lines?: number;
  minFontSize?: number;
  maxFontSize?: number;
  lineHeightRatio?: number;
  regionFillRatio?: number;
}

interface RegionSplit {
  hero: number;
  support: number;
  detail: number;
}

const MIN_DIMENSION = 1;
const MIN_REGION_HEIGHT = 1;

const REGION_SPLIT_BY_TIER: Record<WidgetRenderSizeTier, RegionSplit> = {
  compact: { hero: 0.64, support: 0.24, detail: 0.12 },
  regular: { hero: 0.56, support: 0.24, detail: 0.20 },
  large: { hero: 0.54, support: 0.24, detail: 0.22 },
  fullscreen: { hero: 0.56, support: 0.22, detail: 0.22 },
};

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function resolveOrientation(viewportWidth: number, viewportHeight: number): WidgetRenderOrientation {
  return viewportWidth >= viewportHeight ? "landscape" : "portrait";
}

function resolveSizeTier(
  areaRatio: number,
  widthRatio: number,
  heightRatio: number,
  isFullscreen: boolean,
): WidgetRenderSizeTier {
  if (isFullscreen) {
    return "fullscreen";
  }

  // "large" covers all non-fullscreen widgets that are meaningfully large —
  // including what was formerly a separate "hero" tier.
  if (areaRatio >= 0.24 || (widthRatio >= 0.65 && heightRatio >= 0.35)) {
    return "large";
  }

  if (areaRatio >= 0.11 || (widthRatio >= 0.45 && heightRatio >= 0.26)) {
    return "regular";
  }

  return "compact";
}

export function deriveWidgetRenderContext(input: DeriveWidgetRenderContextInput): WidgetRenderContext {
  const viewportWidth = Math.max(MIN_DIMENSION, input.viewportWidth);
  const viewportHeight = Math.max(MIN_DIMENSION, input.viewportHeight);
  const widgetWidth = Math.max(MIN_DIMENSION, input.widgetWidth);
  const widgetHeight = Math.max(MIN_DIMENSION, input.widgetHeight);

  const widthRatio = clamp(widgetWidth / viewportWidth, 0, 1);
  const heightRatio = clamp(widgetHeight / viewportHeight, 0, 1);
  const areaRatio = clamp((widgetWidth * widgetHeight) / (viewportWidth * viewportHeight), 0, 1);

  const isFullscreen = widthRatio >= 0.98 && heightRatio >= 0.98;
  const sizeTier = resolveSizeTier(areaRatio, widthRatio, heightRatio, isFullscreen);

  return {
    viewportWidth,
    viewportHeight,
    widgetWidth,
    widgetHeight,
    widthRatio,
    heightRatio,
    areaRatio,
    orientation: resolveOrientation(viewportWidth, viewportHeight),
    platform: input.platform,
    safeAreaInsets: {
      top: Math.max(0, input.safeAreaInsets?.top ?? 0),
      right: Math.max(0, input.safeAreaInsets?.right ?? 0),
      bottom: Math.max(0, input.safeAreaInsets?.bottom ?? 0),
      left: Math.max(0, input.safeAreaInsets?.left ?? 0),
    },
    isFullscreen,
    sizeTier,
  };
}

export function deriveWidgetVisualScale(renderContext?: WidgetRenderContext): WidgetVisualScale {
  if (!renderContext) {
    return {
      sizeTier: "regular",
      typographyScale: 1,
      iconScale: 1,
      spacingScale: 1,
      density: "balanced",
      framePadding: 12,
      contentGap: 8,
    };
  }

  const isMobile = renderContext.platform === "ios" || renderContext.platform === "android";

  if (renderContext.sizeTier === "fullscreen") {
    const mobileBoost = isMobile ? 0.18 : 0;

    return {
      sizeTier: "fullscreen",
      typographyScale: 1.7 + mobileBoost,
      iconScale: 1.6 + mobileBoost,
      spacingScale: 1.35,
      density: "relaxed",
      framePadding: 20,
      contentGap: 16,
    };
  }

  // "large" covers widgets from roughly 24 % to ~98 % of viewport area.
  // Scale values match what was previously the "hero" tier so that the upper
  // end of this range renders with generous typography and spacing.
  if (renderContext.sizeTier === "large") {
    return {
      sizeTier: "large",
      typographyScale: 1.45,
      iconScale: 1.35,
      spacingScale: 1.22,
      density: "relaxed",
      framePadding: 16,
      contentGap: 12,
    };
  }

  if (renderContext.sizeTier === "compact") {
    return {
      sizeTier: "compact",
      typographyScale: 0.88,
      iconScale: 0.85,
      spacingScale: 0.84,
      density: "compact",
      framePadding: 8,
      contentGap: 6,
    };
  }

  return {
    sizeTier: "regular",
    typographyScale: 1,
    iconScale: 1,
    spacingScale: 1,
    density: "balanced",
    framePadding: 12,
    contentGap: 8,
  };
}

/**
 * Returns canonical layout tokens for a given render context.
 *
 * Fullscreen tokens are proportional to widget pixel dimensions so that
 * typography, iconography, and inter-region spacing all scale together.
 * Non-fullscreen tokens use the visual-scale multiplier system.
 *
 * Use these tokens to implement the three-region (Hero / Support / Detail)
 * model described in docs/canonical/render-architecture.md.
 */
export function computeRenderTokens(context: WidgetRenderContext): WidgetRenderTokens {
  const h = context.widgetHeight;
  const w = context.widgetWidth;

  if (context.sizeTier === "fullscreen") {
    // All values are proportional to widget height so the composition scales
    // uniformly across viewport sizes.
    const heroBase = Math.round(h * 0.30);
    const heroCapped = w > 0 ? Math.min(heroBase, Math.round(w * 0.70)) : heroBase;
    return {
      heroFontSize: heroCapped,
      titleFontSize: Math.round(h * 0.050),
      bodyFontSize: Math.round(h * 0.040),
      metaFontSize: Math.round(h * 0.028),
      heroSupportGap: Math.round(h * 0.065),
      supportDetailGap: Math.round(h * 0.045),
      itemGap: Math.round(h * 0.018),
      iconSize: "xl",
    };
  }

  if (context.sizeTier === "large") {
    return {
      heroFontSize: scaleBy(44, 1.35, 28),
      titleFontSize: scaleBy(18, 1.25, 14),
      bodyFontSize: scaleBy(14, 1.20, 12),
      metaFontSize: scaleBy(11, 1.12, 10),
      heroSupportGap: scaleBy(14, 1.22, 6),
      supportDetailGap: scaleBy(10, 1.18, 4),
      itemGap: scaleBy(8, 1.15, 4),
      iconSize: "lg",
    };
  }

  if (context.sizeTier === "regular") {
    return {
      heroFontSize: scaleBy(44, 1.0, 22),
      titleFontSize: scaleBy(18, 1.0, 12),
      bodyFontSize: scaleBy(14, 1.0, 11),
      metaFontSize: scaleBy(11, 1.0, 9),
      heroSupportGap: scaleBy(14, 1.0, 6),
      supportDetailGap: scaleBy(10, 1.0, 4),
      itemGap: scaleBy(8, 1.0, 4),
      iconSize: "md",
    };
  }

  // compact
  return {
    heroFontSize: scaleBy(44, 0.88, 18),
    titleFontSize: scaleBy(18, 0.88, 11),
    bodyFontSize: scaleBy(14, 0.85, 10),
    metaFontSize: scaleBy(11, 0.82, 8),
    heroSupportGap: scaleBy(8, 0.85, 4),
    supportDetailGap: scaleBy(6, 0.82, 3),
    itemGap: scaleBy(4, 0.85, 2),
    iconSize: "md",
  };
}

export function scaleBy(base: number, multiplier: number, min = 1): number {
  return Math.max(min, Math.round(base * multiplier));
}

export function computeRegionHeights(context: WidgetRenderContext): WidgetRegionHeights {
  const widgetHeight = Math.max(MIN_REGION_HEIGHT, context.widgetHeight);
  const split = REGION_SPLIT_BY_TIER[context.sizeTier];

  const hero = Math.max(MIN_REGION_HEIGHT, Math.round(widgetHeight * split.hero));
  const support = Math.max(MIN_REGION_HEIGHT, Math.round(widgetHeight * split.support));
  const detail = Math.max(MIN_REGION_HEIGHT, widgetHeight - hero - support);

  return { hero, support, detail };
}

export function fitTextToRegion(input: FitTextToRegionInput): { fontSize: number; lineHeight: number } {
  const lines = Math.max(1, Math.round(input.lines ?? 1));
  const regionHeight = Math.max(MIN_REGION_HEIGHT, input.regionHeight);
  const minFontSize = Math.max(1, Math.round(input.minFontSize ?? 1));
  const lineHeightRatio = clamp(input.lineHeightRatio ?? 1.12, 1.05, 1.6);
  const regionFillRatio = clamp(input.regionFillRatio ?? 0.84, 0.5, 0.95);
  const maxFontSizeFromRegion = Math.max(
    minFontSize,
    Math.floor((regionHeight * regionFillRatio) / (lines * lineHeightRatio)),
  );
  const requestedMax = input.maxFontSize !== undefined
    ? Math.max(minFontSize, Math.round(input.maxFontSize))
    : Number.MAX_SAFE_INTEGER;
  const cappedMax = Math.min(requestedMax, maxFontSizeFromRegion);
  const targetFontSize = Math.round(input.targetFontSize);
  const fontSize = clamp(targetFontSize, minFontSize, cappedMax);
  const lineHeight = Math.max(fontSize + 2, Math.round(fontSize * lineHeightRatio));

  return { fontSize, lineHeight };
}
