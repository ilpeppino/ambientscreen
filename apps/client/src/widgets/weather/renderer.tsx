import React from "react";
import { StyleSheet, View } from "react-native";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, spacing } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";

export function WeatherRenderer({ state, data }: WidgetRendererProps<"weather">) {
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
          <Text style={styles.temperature}>{data?.temperatureC === null ? "--" : data?.temperatureC}</Text>
          <Text style={styles.temperatureUnit}>C</Text>
        </View>
      </View>
      <Text style={styles.location}>{data?.location ?? "Unknown location"}</Text>
      <Text style={styles.condition}>{data?.conditionLabel ?? "No condition available"}</Text>
    </BaseWidgetFrame>
  );
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
    fontSize: 24,
    lineHeight: 32,
    color: colors.textSecondary,
    textAlign: "center",
  },
  temperature: {
    fontSize: 96,
    lineHeight: 102,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  temperatureUnit: {
    marginTop: spacing.md,
    fontSize: 24,
    color: colors.textSecondary,
  },
  condition: {
    marginTop: spacing.xs,
    fontSize: 26,
    lineHeight: 34,
    color: colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
});
