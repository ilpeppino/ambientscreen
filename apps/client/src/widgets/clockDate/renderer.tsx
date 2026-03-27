import React from "react";
import { StyleSheet, View } from "react-native";
import type {
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import { colors, spacing } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";
import { deriveWidgetVisualScale, scaleBy } from "../shared/widgetRenderContext";

export function ClockDateRenderer({ state, data, renderContext }: WidgetRendererProps<"clockDate">) {
  const visualScale = deriveWidgetVisualScale(renderContext);
  const hasData = Boolean(data?.formattedTime);
  const isFullscreen = visualScale.sizeTier === "fullscreen";
  const widgetHeight = renderContext?.widgetHeight ?? 0;
  const widgetWidth = renderContext?.widgetWidth ?? 0;

  // Hero region: primary time display.
  // In fullscreen, size is proportional to widget height (capped by width to
  // avoid single-line overflow). Otherwise use the visual-scale multiplier.
  const timeSize = isFullscreen && widgetHeight > 0
    ? Math.min(
        Math.round(widgetHeight * 0.32),
        widgetWidth > 0 ? Math.round(widgetWidth * 0.75) : Number.MAX_SAFE_INTEGER,
      )
    : scaleBy(36, visualScale.typographyScale, 22);
  const timeLineHeight = Math.round(timeSize * 1.08);

  // Support region: weekday + date labels.
  const weekdaySize = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.055)
    : scaleBy(14, visualScale.typographyScale, 10);
  const dateSize = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.040)
    : scaleBy(11, visualScale.typographyScale, 10);

  // Inter-region spacing: generous breathing room below the hero in fullscreen.
  // Canonical rule: support region must have clearly visible separation from hero.
  const heroSupportGap = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.065)
    : spacing.xs;
  const supportItemGap = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.018)
    : 2;

  return (
    <BaseWidgetFrame
      title="Clock"
      icon="clock"
      state={state}
      hasData={hasData}
      emptyMessage="No clock data available."
      contentStyle={styles.content}
      renderContext={renderContext}
    >
      {/* Hero region */}
      <Text
        style={[styles.time, { fontSize: timeSize, lineHeight: timeLineHeight }]}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.45}
      >
        {data?.formattedTime}
      </Text>

      {/* Support region */}
      <View style={[styles.metaGroup, { marginTop: heroSupportGap, gap: supportItemGap }]}>
        {data?.weekdayLabel ? (
          <Text
            style={[styles.weekday, { fontSize: weekdaySize, lineHeight: scaleBy(16, visualScale.typographyScale, 12) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {data.weekdayLabel}
          </Text>
        ) : null}
        {data?.formattedDate ? (
          <Text
            style={[styles.date, { fontSize: dateSize, lineHeight: scaleBy(13, visualScale.typographyScale, 11) }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {data.formattedDate}
          </Text>
        ) : null}
      </View>
    </BaseWidgetFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  metaGroup: {
    marginTop: spacing.xs,
    alignItems: "center",
    gap: 2,
  },
  weekday: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  date: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
  },
});
