import React from "react";
import { StyleSheet, View, type LayoutChangeEvent } from "react-native";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";

export function WeatherRenderer({ state, data }: WidgetRendererProps<"weather">) {
  const [contentSize, setContentSize] = React.useState({ width: 260, height: 160 });
  const scale = clamp(
    Math.min(contentSize.width / 300, contentSize.height / 190),
    0.5,
    1,
  );
  const compact = contentSize.height < 145;

  const hasData = data !== null
    && (data.temperatureC !== null || Boolean(data.conditionLabel) || Boolean(data.location));

  function handleContentLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    if (width > 0 && height > 0) {
      setContentSize({ width, height });
    }
  }

  const forecastSlots = data?.forecast ?? [];

  return (
    <BaseWidgetFrame
      title="Weather"
      icon="weather"
      state={state}
      hasData={hasData}
      emptyMessage="No weather data was returned."
      surfaceStyle={styles.surfaceFrame}
      contentStyle={styles.contentFrame}
      onContentLayout={handleContentLayout}
    >
      <View style={styles.heroRow}>
        <AppIcon name="weather" size="lg" color="textSecondary" />
        <View style={styles.temperatureGroup}>
          <Text
            style={[styles.temperature, { fontSize: Math.round(50 * scale), lineHeight: Math.round(52 * scale) }]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.45}
          >
            {data?.temperatureC === null ? "--" : data?.temperatureC}
          </Text>
          <Text style={[styles.temperatureUnit, { fontSize: Math.round(16 * scale) }]}>°C</Text>
        </View>
      </View>
      <Text
        style={[styles.location, { fontSize: Math.round(14 * scale) }]}
        numberOfLines={1}
        adjustsFontSizeToFit
        minimumFontScale={0.7}
      >
        {data?.location ?? "Unknown location"}
      </Text>
      {!compact ? (
        <Text
          style={[styles.condition, { fontSize: Math.round(16 * scale) }]}
          numberOfLines={1}
          adjustsFontSizeToFit
          minimumFontScale={0.65}
        >
          {data?.conditionLabel ?? "No condition available"}
        </Text>
      ) : null}
      {!compact && forecastSlots.length > 0 ? (
        <View style={styles.forecastRow}>
          {forecastSlots.map((slot, index) => (
            <View key={index} style={styles.forecastSlot}>
              <Text style={[styles.forecastTime, { fontSize: Math.round(10 * scale) }]} numberOfLines={1}>
                {formatForecastTime(slot.timeIso)}
              </Text>
              <Text style={[styles.forecastTemp, { fontSize: Math.round(13 * scale) }]} numberOfLines={1}>
                {slot.temperatureC !== null ? `${slot.temperatureC}°` : "--"}
              </Text>
              <Text style={[styles.forecastCondition, { fontSize: Math.round(9 * scale) }]} numberOfLines={1}>
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

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
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
