import React from "react";
import { StyleSheet, View } from "react-native";
import type {
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import { colors, spacing } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";

export function ClockDateRenderer({ state, data }: WidgetRendererProps<"clockDate">) {
  const hasData = Boolean(data?.formattedTime);

  return (
    <BaseWidgetFrame
      title="Clock"
      icon="clock"
      state={state}
      hasData={hasData}
      emptyMessage="No clock data available."
      contentStyle={styles.content}
    >
      <Text style={styles.time}>{data?.formattedTime}</Text>
      <View style={styles.metaGroup}>
        {data?.weekdayLabel ? (
          <Text style={styles.weekday}>{data.weekdayLabel}</Text>
        ) : null}
        {data?.formattedDate ? (
          <Text style={styles.date}>{data.formattedDate}</Text>
        ) : null}
      </View>
    </BaseWidgetFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 112,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textAlign: "center",
    lineHeight: 118,
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
