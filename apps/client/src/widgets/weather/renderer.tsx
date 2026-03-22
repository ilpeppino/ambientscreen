import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  WeatherWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { colors, spacing } from "../../shared/ui/theme";

export function WeatherRenderer({ data }: WidgetRendererProps<WeatherWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.statusTitle}>Weather unavailable</Text>
          <Text style={styles.statusMessage}>No weather data was returned.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.location}>{data.location ?? "Unknown location"}</Text>
        <Text style={styles.temperature}>
          {data.temperatureC === null ? "--" : data.temperatureC}
          <Text style={styles.temperatureUnit}> C</Text>
        </Text>
        <Text style={styles.condition}>{data.conditionLabel ?? "No condition available"}</Text>
      </View>
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
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  statusTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  statusMessage: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 24,
    color: colors.textSecondary,
    textAlign: "center",
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
