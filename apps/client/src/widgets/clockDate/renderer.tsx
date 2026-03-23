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
      <Text
        style={styles.time}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.45}
      >
        {data?.formattedTime}
      </Text>
      <View style={styles.metaGroup}>
        {data?.weekdayLabel ? (
          <Text
            style={styles.weekday}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {data.weekdayLabel}
          </Text>
        ) : null}
        {data?.formattedDate ? (
          <Text
            style={styles.date}
            numberOfLines={1}
            adjustsFontSizeToFit
            minimumFontScale={0.6}
          >
            {data.formattedDate}
          </Text>
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
    fontSize: 36,
    lineHeight: 38,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.2,
    textAlign: "center",
  },
  metaGroup: {
    marginTop: spacing.xs,
    alignItems: "center",
    gap: 1,
  },
  weekday: {
    fontSize: 14,
    lineHeight: 16,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textTransform: "uppercase",
    textAlign: "center",
  },
  date: {
    fontSize: 11,
    lineHeight: 13,
    fontWeight: "500",
    color: colors.textSecondary,
    textAlign: "center",
  },
});
