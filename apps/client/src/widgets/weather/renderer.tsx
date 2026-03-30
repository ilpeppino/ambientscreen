import React from "react";
import { StyleSheet, View } from "react-native";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";
import {
  computeRegionHeights,
  computeRegionInsets,
  deriveWidgetVisualScale,
  fitTextToRegion,
  scaleBy,
} from "../shared/widgetRenderContext";

export function WeatherRenderer({ state, data, config, renderContext }: WidgetRendererProps<"weather">) {
  const visualScale = deriveWidgetVisualScale(renderContext);
  const compact = visualScale.sizeTier === "compact";
  const isFullscreen = visualScale.sizeTier === "fullscreen";
  const widgetHeight = renderContext?.widgetHeight ?? 0;
  const regions = computeRegionHeights(renderContext ?? {
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
  });

  const hasData = data !== null
    && (data.temperatureC !== null || Boolean(data.conditionLabel) || Boolean(data.location));

  const forecastSlots = data?.forecast ?? [];
  const weatherUnits = config.units ?? "metric";
  const iconSize = visualScale.iconScale >= 1.5 ? "xl" : visualScale.iconScale >= 1.15 ? "lg" : "md";

  // Hero region: temperature display.
  // Proportional to height in fullscreen; scaled by visual-scale multiplier otherwise.
  const tempFontSize = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.34)
    : scaleBy(44, visualScale.typographyScale, 26);
  const tempUnitFontSize = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.08)
    : scaleBy(16, visualScale.typographyScale, 12);
  const tempText = fitTextToRegion({
    targetFontSize: tempFontSize,
    regionHeight: regions.hero,
    minFontSize: 20,
    lineHeightRatio: 1.08,
    regionFillRatio: 0.78,
  });

  // Inter-region spacing: height-proportional in fullscreen so hero, support,
  // and detail regions have clear visual separation.
  const heroSupportGap = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.065)
    : scaleBy(spacing.sm, visualScale.spacingScale, 4);
  const supportIntraGap = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.025)
    : scaleBy(spacing.xs, visualScale.spacingScale, 2);
  const supportDetailGap = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.05)
    : scaleBy(spacing.sm, visualScale.spacingScale, 4);
  const regionInsets = computeRegionInsets(regions, {
    supportTop: heroSupportGap,
    detailTop: supportDetailGap,
  });
  const supportRegionHeight = Math.max(1, regions.support - regionInsets.supportTop);
  const detailRegionHeight = Math.max(1, regions.detail - regionInsets.detailTop);
  const locationText = fitTextToRegion({
    targetFontSize: scaleBy(14, visualScale.typographyScale, 11),
    regionHeight: Math.max(1, Math.round(supportRegionHeight * (compact ? 0.85 : 0.44))),
    minFontSize: 10,
    lineHeightRatio: 1.18,
  });
  const conditionText = fitTextToRegion({
    targetFontSize: scaleBy(16, visualScale.typographyScale, 12),
    regionHeight: Math.max(1, Math.round(supportRegionHeight * 0.40)),
    minFontSize: 10,
    lineHeightRatio: 1.16,
  });
  const forecastTimeText = fitTextToRegion({
    targetFontSize: scaleBy(10, visualScale.typographyScale, 9),
    regionHeight: Math.max(1, Math.round(detailRegionHeight * 0.22)),
    minFontSize: 8,
    lineHeightRatio: 1.12,
  });
  const forecastTempText = fitTextToRegion({
    targetFontSize: scaleBy(13, visualScale.typographyScale, 11),
    regionHeight: Math.max(1, Math.round(detailRegionHeight * 0.28)),
    minFontSize: 9,
    lineHeightRatio: 1.12,
  });
  const forecastConditionText = fitTextToRegion({
    targetFontSize: scaleBy(9, visualScale.typographyScale, 8),
    regionHeight: Math.max(1, Math.round(detailRegionHeight * 0.22)),
    minFontSize: 7,
    lineHeightRatio: 1.14,
  });

  return (
    <BaseWidgetFrame
      title="Weather"
      icon="weather"
      state={state}
      hasData={hasData}
      emptyMessage="No weather data was returned."
      surfaceStyle={styles.surfaceFrame}
      contentStyle={styles.contentFrame}
      renderContext={renderContext}
    >
      <View style={[styles.heroRegion, { flexBasis: regions.hero, minHeight: regions.hero }]}>
        {/* Hero region: temperature + icon */}
        <View style={[styles.heroRow, { gap: scaleBy(spacing.sm, visualScale.spacingScale, 4) }]}>
          <AppIcon name="weather" size={iconSize} color="textSecondary" />
          <View style={styles.temperatureGroup}>
            <Text
              style={[styles.temperature, {
                fontSize: tempText.fontSize,
                lineHeight: tempText.lineHeight,
              }]}
              adjustsFontSizeToFit
              numberOfLines={1}
              minimumFontScale={0.45}
            >
              {formatTemperatureValue(data?.temperatureC ?? null, weatherUnits)}
            </Text>
            <Text style={[styles.temperatureUnit, { fontSize: tempUnitFontSize, lineHeight: Math.round(tempUnitFontSize * 1.1) }]}>°C</Text>
          </View>
        </View>
      </View>

      <View style={[styles.supportRegion, {
        flexBasis: regions.support,
        minHeight: regions.support,
        paddingTop: regionInsets.supportTop,
      }]}
      >
        {/* Support region: location + condition */}
        <Text
          style={[styles.location, {
            fontSize: locationText.fontSize,
            lineHeight: locationText.lineHeight,
          }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.7}
        >
          {data?.location ?? "Unknown location"}
        </Text>
        {!compact ? (
          <Text
            style={[styles.condition, {
              marginTop: supportIntraGap,
              fontSize: conditionText.fontSize,
              lineHeight: conditionText.lineHeight,
            }]}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.65}
          >
            {data?.conditionLabel ?? "No condition available"}
          </Text>
        ) : null}
      </View>

      {/* Detail region: forecast strip */}
      {!compact && forecastSlots.length > 0 ? (
        <View style={[styles.detailRegion, {
          flexBasis: regions.detail,
          minHeight: regions.detail,
          paddingTop: regionInsets.detailTop,
        }]}
        >
          <View style={[styles.forecastRow, {
            gap: scaleBy(spacing.xs, visualScale.spacingScale, 2),
          }]}>
            {forecastSlots.map((slot, index) => (
              <View key={index} style={[styles.forecastSlot, {
                paddingHorizontal: scaleBy(spacing.xs, visualScale.spacingScale, 2),
                minWidth: isFullscreen ? 60 : 44,
              }]}>
                <Text
                  style={[styles.forecastTime, { fontSize: forecastTimeText.fontSize, lineHeight: forecastTimeText.lineHeight }]}
                  numberOfLines={1}
                >
                  {formatForecastTime(slot.timeIso)}
                </Text>
                <Text
                  style={[styles.forecastTemp, { fontSize: forecastTempText.fontSize, lineHeight: forecastTempText.lineHeight }]}
                  numberOfLines={1}
                >
                  {slot.temperatureC !== null ? `${formatTemperatureValue(slot.temperatureC, weatherUnits)}°` : "--"}
                </Text>
                <Text
                  style={[styles.forecastCondition, { fontSize: forecastConditionText.fontSize, lineHeight: forecastConditionText.lineHeight }]}
                  numberOfLines={1}
                >
                  {slot.conditionLabel ?? ""}
                </Text>
              </View>
            ))}
          </View>
        </View>
      ) : (
        <View style={[styles.detailRegion, { flexBasis: regions.detail, minHeight: regions.detail }]} />
      )}
    </BaseWidgetFrame>
  );
}

function formatTemperatureValue(
  value: number | null,
  units: "metric" | "imperial" | "standard",
): string {
  if (value === null) {
    return "--";
  }

  if (units === "metric") {
    return String(Math.round(value));
  }

  return String(value);
}

function formatForecastTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}

const styles = StyleSheet.create({
  surfaceFrame: {
    flex: 1,
    width: "100%",
    alignSelf: "stretch",
  },
  contentFrame: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-start",
    width: "100%",
    minHeight: 0,
    overflow: "hidden",
  },
  heroRegion: {
    width: "100%",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "flex-end",
  },
  supportRegion: {
    width: "100%",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  detailRegion: {
    width: "100%",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.sm,
    maxWidth: "100%",
  },
  temperatureGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
    maxWidth: "100%",
  },
  location: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: "100%",
  },
  temperature: {
    fontSize: 42,
    lineHeight: 44,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.4,
    textAlign: "center",
  },
  temperatureUnit: {
    marginTop: spacing.sm,
    fontSize: 16,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  condition: {
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: "center",
    maxWidth: "100%",
  },
  forecastRow: {
    flexDirection: "row",
    gap: spacing.xs,
    justifyContent: "center",
    maxWidth: "100%",
  },
  forecastSlot: {
    alignItems: "center",
    minWidth: 44,
    paddingHorizontal: spacing.xs,
  },
  forecastTime: {
    color: colors.textSecondary,
    textAlign: "center",
  },
  forecastTemp: {
    fontWeight: "600",
    color: colors.textPrimary,
    textAlign: "center",
    marginTop: 2,
  },
  forecastCondition: {
    color: colors.textSecondary,
    textAlign: "center",
    marginTop: 1,
  },
});
