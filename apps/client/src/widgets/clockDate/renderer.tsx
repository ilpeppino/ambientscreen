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
          <WidgetHeader mode="display" icon="clock" title="Clock" />
          <WidgetState type="empty" compact message="No clock data available." />
        </WidgetSurface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WidgetSurface style={styles.card}>
        <WidgetHeader mode="display" icon="clock" title="Clock" />
        <Text style={styles.time}>{data.formattedTime}</Text>
        <View style={styles.metaGroup}>
          {data.weekdayLabel ? (
            <Text style={styles.weekday}>{data.weekdayLabel}</Text>
          ) : null}
          {data.formattedDate ? (
            <Text style={styles.date}>{data.formattedDate}</Text>
          ) : null}
        </View>
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
    maxWidth: 760,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.xxl,
    paddingVertical: spacing.xxl,
  },
  time: {
    fontSize: 118,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 1,
    textAlign: "center",
    lineHeight: 126,
  },
  metaGroup: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  weekday: {
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  date: {
    fontSize: 24,
    color: colors.textSecondary,
    lineHeight: 30,
    textAlign: "center",
  },
});
