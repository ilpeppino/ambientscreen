import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type {
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import { colors, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";

export function ClockDateRenderer({ state, data }: WidgetRendererProps<"clockDate">) {
  const hasData = Boolean(data?.formattedTime);
  const { width } = useWindowDimensions();
  const scale = clamp(width / 1280, 0.5, 1);

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
        style={[
          styles.time,
          {
            fontSize: Math.round(typography.displayLg.fontSize * scale),
            lineHeight: Math.round((typography.displayLg.lineHeight ?? typography.displayLg.fontSize) * scale),
          },
        ]}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.5}
      >
        {data?.formattedTime}
      </Text>
      <View style={styles.metaGroup}>
        {data?.weekdayLabel ? (
          <Text style={[styles.weekday, { fontSize: Math.round(typography.titleLg.fontSize * scale) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {data.weekdayLabel}
          </Text>
        ) : null}
        {data?.formattedDate ? (
          <Text style={[styles.date, { fontSize: Math.round(typography.titleMd.fontSize * scale) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {data.formattedDate}
          </Text>
        ) : null}
      </View>
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
  time: {
    ...typography.displayLg,
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textAlign: "center",
  },
  metaGroup: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  weekday: {
    ...typography.titleLg,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  date: {
    ...typography.titleMd,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
