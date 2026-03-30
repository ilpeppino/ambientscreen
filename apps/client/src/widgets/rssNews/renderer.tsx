import React from "react";
import { ImageBackground, StyleSheet, View } from "react-native";
import type { WidgetRenderContext, WidgetRendererProps } from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";
import {
  computeRegionHeights,
  computeRegionInsets,
  computeRenderTokens,
  deriveWidgetVisualScale,
  fitTextToRegion,
  scaleBy,
} from "../shared/widgetRenderContext";

function formatPublishedAt(value: string | undefined): string | null {
  if (!value) {
    return null;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }

  const now = Date.now();
  const deltaMinutes = Math.max(0, Math.floor((now - parsed.getTime()) / 60000));

  if (deltaMinutes < 60) {
    return `${Math.max(1, deltaMinutes)}m ago`;
  }

  const deltaHours = Math.floor(deltaMinutes / 60);
  if (deltaHours < 24) {
    return `${deltaHours}h ago`;
  }

  const deltaDays = Math.floor(deltaHours / 24);
  return `${deltaDays}d ago`;
}

export function RssNewsRenderer({ state, data, config, renderContext }: WidgetRendererProps<"rssNews">) {
  const safeContext: WidgetRenderContext = renderContext ?? {
    viewportWidth: 1,
    viewportHeight: 1,
    widgetWidth: 1,
    widgetHeight: 1,
    widthRatio: 1,
    heightRatio: 1,
    areaRatio: 1,
    orientation: "landscape",
    platform: "web",
    safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
    isFullscreen: false,
    sizeTier: "regular",
  };
  const visualScale = deriveWidgetVisualScale(safeContext);
  const tokens = computeRenderTokens(safeContext);
  const regions = computeRegionHeights(safeContext);
  const { widgetWidth, widgetHeight, sizeTier, isFullscreen } = safeContext;

  const layout = config.layout ?? "headline-list";
  const showImages = config.showImages ?? true;
  const showPublishedAt = config.showPublishedAt ?? true;
  const items = data?.items ?? [];
  const firstItem = items[0] ?? null;
  const hasData = items.length > 0;
  const title = data?.title || config.title || "Latest News";
  const allowHeroImage = showImages && layout === "headline-list" && Boolean(firstItem?.imageUrl);
  const isCompact = sizeTier === "compact";

  const maxDetailItemsByTier = sizeTier === "fullscreen"
    ? 3
    : sizeTier === "large"
    ? 3
    : sizeTier === "regular"
    ? 2
    : 0;

  // Density-first timestamp policy: remove timestamps before reducing detail content.
  const showHeroTimestamp = showPublishedAt && !isCompact;
  const showDetailTimestamp = showPublishedAt && sizeTier === "fullscreen";
  const regionInsets = computeRegionInsets(regions, {
    supportTop: tokens.heroSupportGap,
    detailTop: tokens.supportDetailGap,
  });
  const detailAvailableHeight = Math.max(1, regions.detail - regionInsets.detailTop);

  const heroTitleText = fitTextToRegion({
    targetFontSize: isFullscreen ? Math.round(widgetHeight * 0.058) : scaleBy(24, visualScale.typographyScale, 14),
    regionHeight: Math.max(1, Math.round(regions.hero * (allowHeroImage ? 0.28 : 0.62))),
    lines: layout === "ticker" ? 1 : 2,
    minFontSize: 11,
    lineHeightRatio: 1.1,
    regionFillRatio: 0.74,
  });
  const supportMetaText = fitTextToRegion({
    targetFontSize: tokens.metaFontSize,
    regionHeight: Math.max(1, Math.round(regions.support * 0.30)),
    minFontSize: 8,
    lineHeightRatio: 1.1,
  });
  const detailTitleText = fitTextToRegion({
    targetFontSize: scaleBy(13, visualScale.typographyScale, 10),
    regionHeight: Math.max(
      1,
      Math.round(detailAvailableHeight / Math.max(1, maxDetailItemsByTier)),
    ),
    lines: 1,
    minFontSize: 9,
    lineHeightRatio: 1.1,
    regionFillRatio: 0.76,
  });
  const detailMetaText = fitTextToRegion({
    targetFontSize: tokens.metaFontSize,
    regionHeight: Math.max(1, Math.round(detailAvailableHeight * 0.22)),
    minFontSize: 8,
    lineHeightRatio: 1.1,
  });
  const detailRowGap = scaleBy(tokens.itemGap, 1, 3);
  const detailRowContentHeight = detailTitleText.lineHeight + (showDetailTimestamp ? detailMetaText.lineHeight + 2 : 0);
  const maxDetailRowsByHeight = Math.max(
    0,
    Math.floor((detailAvailableHeight + detailRowGap) / Math.max(1, detailRowContentHeight + detailRowGap)),
  );
  const resolvedDetailRows = Math.min(maxDetailItemsByTier, maxDetailRowsByHeight);
  const detailItems = items.slice(1, 1 + resolvedDetailRows);

  const heroContentWidth = Math.min(widgetWidth, widgetWidth * (isFullscreen ? 0.92 : 0.9));
  const heroImageMaxHeight = Math.max(56, Math.round(regions.hero * 0.64));
  const heroImageHeight = Math.min(heroImageMaxHeight, Math.round(heroContentWidth * (9 / 16)));
  const heroRegionHeight = regions.hero + regions.support;

  return (
    <BaseWidgetFrame
      title={title}
      icon="alert"
      state={state}
      hasData={hasData}
      emptyMessage={state === "stale" ? "News feed is unavailable." : "No headlines available."}
      surfaceStyle={styles.surface}
      contentStyle={styles.content}
      renderContext={safeContext}
    >
      <View style={[styles.heroRegion, { flexBasis: heroRegionHeight, minHeight: heroRegionHeight }]}>
        {allowHeroImage && firstItem?.imageUrl && !isCompact ? (
          <ImageBackground
            source={{ uri: firstItem.imageUrl }}
            style={[
              styles.heroImage,
              {
                width: heroContentWidth,
                height: heroImageHeight,
                marginBottom: scaleBy(spacing.xs, visualScale.spacingScale, 2),
              },
            ]}
            imageStyle={styles.heroImageInner}
            resizeMode="cover"
          />
        ) : null}

        {firstItem ? (
          <View style={[styles.heroTitleHighlight, { width: heroContentWidth }]}>
            <Text
              style={[
                styles.heroTitle,
                {
                  fontSize: heroTitleText.fontSize,
                  lineHeight: heroTitleText.lineHeight,
                  width: "100%",
                },
              ]}
              numberOfLines={layout === "ticker" ? 1 : 2}
              ellipsizeMode="tail"
            >
              {firstItem.title}
            </Text>
          </View>
        ) : null}

        {firstItem && showHeroTimestamp && firstItem.publishedAt ? (
          <Text
            style={[
              styles.heroMeta,
              {
                fontSize: supportMetaText.fontSize,
                lineHeight: supportMetaText.lineHeight,
                width: heroContentWidth,
              },
            ]}
            numberOfLines={1}
          >
            {formatPublishedAt(firstItem.publishedAt) ?? ""}
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.supportRegion,
          {
            flexBasis: 0,
            minHeight: 0,
            paddingTop: 0,
            gap: 0,
          },
        ]}
      />

      <View
        style={[
          styles.detailRegion,
          {
            flexBasis: regions.detail,
            minHeight: regions.detail,
            paddingTop: regionInsets.detailTop,
            gap: detailRowGap,
          },
        ]}
      >
        {detailItems.map((item) => (
          <View
            key={item.id}
            style={[styles.detailRow, { minHeight: detailRowContentHeight }]}
          >
            <Text
              style={[styles.rowTitle, { fontSize: detailTitleText.fontSize, lineHeight: detailTitleText.lineHeight }]}
              numberOfLines={1}
              ellipsizeMode="tail"
            >
              {item.title}
            </Text>
            {showDetailTimestamp && item.publishedAt ? (
              <Text
                style={[styles.rowMeta, { fontSize: detailMetaText.fontSize, lineHeight: detailMetaText.lineHeight }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {formatPublishedAt(item.publishedAt) ?? ""}
              </Text>
            ) : null}
          </View>
        ))}
      </View>
    </BaseWidgetFrame>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
  },
  content: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    justifyContent: "center",
    alignItems: "center",
    gap: spacing.xs,
    overflow: "hidden",
  },
  widgetTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "500",
    textAlign: "center",
    maxWidth: "100%",
  },
  siteTitle: {
    ...typography.small,
    color: colors.textSecondary,
    opacity: 0.7,
    textAlign: "center",
    maxWidth: "100%",
  },
  heroRegion: {
    alignSelf: "center",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
    gap: 2,
    overflow: "hidden",
  },
  heroImage: {
    height: 160,
    width: "100%",
    borderRadius: radius.md,
    overflow: "hidden",
  },
  heroImageInner: {
    borderRadius: radius.md,
  },
  heroTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
    maxWidth: "100%",
  },
  heroTitleHighlight: {
    borderRadius: radius.sm,
    backgroundColor: "rgba(255, 255, 255, 0.14)",
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.18)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  heroMeta: {
    ...typography.small,
    color: colors.textSecondary,
    opacity: 0.55,
    marginTop: 2,
    textAlign: "center",
  },
  supportRegion: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  detailRegion: {
    width: "100%",
    alignSelf: "stretch",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  detailRow: {
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 1,
    width: "100%",
  },
  rowTitle: {
    ...typography.small,
    color: colors.textPrimary,
    textAlign: "center",
    maxWidth: "100%",
  },
  rowMeta: {
    ...typography.small,
    color: colors.textSecondary,
    opacity: 0.45,
    textAlign: "center",
  },
});
