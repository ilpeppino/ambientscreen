import React from "react";
import { StyleSheet, View } from "react-native";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";
import { deriveWidgetVisualScale, scaleBy } from "../shared/widgetRenderContext";

export function WeatherRenderer({ state, data, renderContext }: WidgetRendererProps<"weather">) {
  const visualScale = deriveWidgetVisualScale(renderContext);
  const compact = visualScale.sizeTier === "compact";
  const isFullscreen = visualScale.sizeTier === "fullscreen";
  const widgetHeight = renderContext?.widgetHeight ?? 0;

  const hasData = data !== null
    && (data.temperatureC !== null || Boolean(data.conditionLabel) || Boolean(data.location));

  const forecastSlots = data?.forecast ?? [];
  const iconSize = visualScale.iconScale >= 1.5 ? "xl" : visualScale.iconScale >= 1.15 ? "lg" : "md";

  // Hero region: temperature display.
  // Proportional to height in fullscreen; scaled by visual-scale multiplier otherwise.
  const tempFontSize = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.34)
    : scaleBy(44, visualScale.typographyScale, 26);
  const tempLineHeight = Math.round(tempFontSize * 1.06);
  const tempUnitFontSize = isFullscreen && widgetHeight > 0
    ? Math.round(widgetHeight * 0.08)
    : scaleBy(16, visualScale.typographyScale, 12);

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
      {/* Hero region: temperature + icon */}
      <View style={[styles.heroRow, { gap: scaleBy(spacing.sm, visualScale.spacingScale, 4) }]}>
        <AppIcon name="weather" size={iconSize} color="textSecondary" />
        <View style={styles.temperatureGroup}>
          <Text
            style={[styles.temperature, {
              fontSize: tempFontSize,
              lineHeight: tempLineHeight,
            }]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.45}
          >
            {data?.temperatureC === null ? "--" : data?.temperatureC}
          </Text>
          <Text style={[styles.temperatureUnit, { fontSize: tempUnitFontSize }]}>°C</Text>
        </View>
      </View>

      {/* Support region: location + condition */}
      <Text
        style={[styles.location, {
          marginTop: heroSupportGap,
          fontSize: scaleBy(14, visualScale.typographyScale, 11),
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
            fontSize: scaleBy(16, visualScale.typographyScale, 12),
          }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {data?.conditionLabel ?? "No condition available"}
        </Text>
      ) : null}

      {/* Detail region: forecast strip */}
      {!compact && forecastSlots.length > 0 ? (
        <View style={[styles.forecastRow, {
          marginTop: supportDetailGap,
          gap: scaleBy(spacing.xs, visualScale.spacingScale, 2),
        }]}>
          {forecastSlots.map((slot, index) => (
            <View key={index} style={[styles.forecastSlot, {
              paddingHorizontal: scaleBy(spacing.xs, visualScale.spacingScale, 2),
              minWidth: isFullscreen ? 60 : 44,
            }]}>
              <Text style={[styles.forecastTime, { fontSize: scaleBy(10, visualScale.typographyScale, 9) }]} numberOfLines={1}>
                {formatForecastTime(slot.timeIso)}
              </Text>
              <Text style={[styles.forecastTemp, { fontSize: scaleBy(13, visualScale.typographyScale, 11) }]} numberOfLines={1}>
                {slot.temperatureC !== null ? `${slot.temperatureC}°` : "--"}
              </Text>
              <Text style={[styles.forecastCondition, { fontSize: scaleBy(9, visualScale.typographyScale, 8) }]} numberOfLines={1}>
                {slot.conditionLabel ?? ""}
              </Text>
            </View>
          ))}
        </View>
      ) : null}
    </BaseWidgetFrame>
  );
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
    justifyContent: "center",
    overflow: "hidden",
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
    marginTop: spacing.sm,
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
    marginTop: spacing.xs,
    ...typography.titleSm,
    color: colors.textPrimary,
    textAlign: "center",
    maxWidth: "100%",
  },
  forecastRow: {
    flexDirection: "row",
    marginTop: spacing.sm,
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
