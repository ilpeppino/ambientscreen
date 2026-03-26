import React from "react";
import { StyleSheet, View } from "react-native";
import type { WidgetPreviewProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, spacing } from "../../shared/ui/theme";

export function WeatherPreview({ config }: WidgetPreviewProps<"weather">) {
  const city = config.city ?? "Amsterdam";
  const units = config.units ?? "metric";
  const unitLabel = units === "imperial" ? "°F" : units === "standard" ? "K" : "°C";

  return (
    <View style={styles.container}>
      <View style={styles.heroRow}>
        <AppIcon name="weather" size="lg" color="textSecondary" />
        <Text style={styles.temperature}>--</Text>
        <Text style={styles.unit}>{unitLabel}</Text>
      </View>
      <Text style={styles.location} numberOfLines={1}>
        {city}
      </Text>
      <Text style={styles.condition}>Weather</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
  },
  heroRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  temperature: {
    fontSize: 36,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  unit: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  location: {
    marginTop: spacing.sm,
    fontSize: 13,
    color: colors.textSecondary,
    textAlign: "center",
  },
  condition: {
    marginTop: spacing.xs,
    fontSize: 14,
    color: colors.textPrimary,
    textAlign: "center",
  },
});
