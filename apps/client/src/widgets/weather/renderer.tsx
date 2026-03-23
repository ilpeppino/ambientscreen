import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";

export function WeatherRenderer({ state, data }: WidgetRendererProps<"weather">) {
  const { width } = useWindowDimensions();
  const scale = clamp(width / 1280, 0.55, 1);
  const hasData = data !== null
    && (data.temperatureC !== null || Boolean(data.conditionLabel) || Boolean(data.location));

  return (
    <BaseWidgetFrame
      title="Weather"
      icon="weather"
      state={state}
      hasData={hasData}
      emptyMessage="No weather data was returned."
      contentStyle={styles.content}
    >
      <View style={styles.heroRow}>
        <AppIcon name="weather" size="xl" color="textSecondary" />
        <View style={styles.temperatureGroup}>
          <Text
            style={[
              styles.temperature,
              {
                fontSize: Math.round(typography.displayLg.fontSize * scale),
                lineHeight: Math.round((typography.displayLg.lineHeight ?? typography.displayLg.fontSize) * scale),
              },
            ]}
            adjustsFontSizeToFit
            numberOfLines={1}
            minimumFontScale={0.55}
          >
            {data?.temperatureC === null ? "--" : data?.temperatureC}
          </Text>
          <Text style={[styles.temperatureUnit, { fontSize: Math.round(typography.titleMd.fontSize * scale) }]}>C</Text>
        </View>
      </View>
      <Text style={[styles.location, { fontSize: Math.round(typography.titleMd.fontSize * scale) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
        {data?.location ?? "Unknown location"}
      </Text>
      <Text style={[styles.condition, { fontSize: Math.round(typography.titleLg.fontSize * scale) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.65}>
        {data?.conditionLabel ?? "No condition available"}
      </Text>
    </BaseWidgetFrame>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  temperatureGroup: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  location: {
    marginTop: spacing.md,
    ...typography.titleMd,
    color: colors.textSecondary,
    textAlign: "center",
  },
  temperature: {
    ...typography.displayLg,
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  temperatureUnit: {
    marginTop: spacing.md,
    ...typography.titleMd,
    color: colors.textSecondary,
  },
  condition: {
    marginTop: spacing.xs,
    ...typography.titleLg,
    color: colors.textPrimary,
    textAlign: "center",
  },
});
