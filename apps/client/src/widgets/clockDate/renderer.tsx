import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  ClockDateWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { colors, spacing } from "../../shared/ui/theme";
import { WidgetHeader, WidgetState, WidgetSurface } from "../../shared/ui/widgets";

export function ClockDateRenderer({ data }: WidgetRendererProps<ClockDateWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <WidgetSurface style={styles.card}>
          <WidgetHeader icon="clock" title="Clock" />
          <WidgetState type="empty" message="No clock data available." />
        </WidgetSurface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WidgetSurface style={styles.card}>
        <WidgetHeader icon="clock" title="Clock" />
        <Text style={styles.time}>{data.formattedTime}</Text>
        {data.weekdayLabel ? (
          <Text style={styles.weekday}>{data.weekdayLabel}</Text>
        ) : null}
        {data.formattedDate ? (
          <Text style={styles.date}>{data.formattedDate}</Text>
        ) : null}
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
  time: {
    fontSize: 108,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 1.2,
    textAlign: "center",
  },
  weekday: {
    marginTop: 14,
    fontSize: 30,
    color: colors.textPrimary,
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  date: {
    marginTop: 10,
    fontSize: 28,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
