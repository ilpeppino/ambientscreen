import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  WeatherWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { colors, spacing } from "../../shared/ui/theme";
import { WidgetHeader, WidgetState, WidgetSurface } from "../../shared/ui/widgets";

export function WeatherRenderer({ data }: WidgetRendererProps<WeatherWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <WidgetSurface style={styles.card}>
          <WidgetHeader icon="weather" title="Weather" />
          <WidgetState type="empty" message="No weather data was returned." />
        </WidgetSurface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WidgetSurface style={styles.card}>
        <WidgetHeader icon="weather" title="Weather" />
        <Text style={styles.location}>{data.location ?? "Unknown location"}</Text>
        <Text style={styles.temperature}>
          {data.temperatureC === null ? "--" : data.temperatureC}
          <Text style={styles.temperatureUnit}> C</Text>
        </Text>
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
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  location: {
    fontSize: 30,
    lineHeight: 36,
    color: colors.textPrimary,
    textAlign: "center",
  },
  temperature: {
    marginTop: 12,
    fontSize: 86,
    lineHeight: 94,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  temperatureUnit: {
    fontSize: 30,
    color: colors.textSecondary,
  },
  condition: {
    marginTop: 8,
    fontSize: 24,
    lineHeight: 32,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
