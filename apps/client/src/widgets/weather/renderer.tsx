import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  WeatherWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { AppIcon } from "../../shared/ui/components";
import { colors, spacing } from "../../shared/ui/theme";
import { WidgetHeader, WidgetState, WidgetSurface } from "../../shared/ui/widgets";

export function WeatherRenderer({ data }: WidgetRendererProps<WeatherWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <WidgetSurface style={styles.card}>
          <WidgetHeader mode="display" icon="weather" title="Weather" />
          <WidgetState type="empty" compact message="No weather data was returned." />
        </WidgetSurface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WidgetSurface style={styles.card}>
        <WidgetHeader mode="display" icon="weather" title="Weather" />
        <View style={styles.heroRow}>
          <AppIcon name="weather" size="xl" color="textSecondary" />
          <Text style={styles.temperature}>
            {data.temperatureC === null ? "--" : data.temperatureC}
            <Text style={styles.temperatureUnit}> C</Text>
          </Text>
        </View>
        <Text style={styles.location}>{data.location ?? "Unknown location"}</Text>
        <Text style={styles.condition}>{data.conditionLabel ?? "No condition available"}</Text>
      </WidgetSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
    backgroundColor: "transparent",
  },
  card: {
    width: "100%",
    maxWidth: 720,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  heroRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.lg,
  },
  location: {
    marginTop: spacing.sm,
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
    letterSpacing: 1,
    textAlign: "center",
  },
  temperatureUnit: {
    fontSize: 28,
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
