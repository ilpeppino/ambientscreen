import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";

const MAX_VISIBLE_EVENTS = 3;

export function CalendarRenderer({ state, data }: WidgetRendererProps<"calendar">) {
  const { width } = useWindowDimensions();
  const scale = clamp(width / 1280, 0.6, 1);
  const hasData = Boolean(data && data.events.length > 0);

  const visibleEvents = data?.events.slice(0, MAX_VISIBLE_EVENTS) ?? [];
  const remainingEvents = Math.max((data?.events.length ?? 0) - visibleEvents.length, 0);

  return (
    <BaseWidgetFrame
      title="Calendar"
      icon="calendar"
      state={state}
      hasData={hasData}
      emptyMessage="No upcoming events."
      contentStyle={styles.content}
    >
      <Text
        style={[
          styles.count,
          {
            fontSize: Math.round(typography.displaySm.fontSize * scale),
          },
        ]}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.65}
      >
        {data?.upcomingCount ?? 0} upcoming
      </Text>
      <View style={styles.eventsList}>
        {visibleEvents.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <Text style={[styles.eventTitle, { fontSize: Math.round(typography.titleMd.fontSize * scale) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.7}>
              {event.title}
            </Text>
            <View style={styles.metaRow}>
              <AppIcon name="clock" size="sm" color="textSecondary" />
              <Text style={[styles.eventMeta, { fontSize: Math.round(typography.titleSm.fontSize * scale) }]} numberOfLines={1}>
                {formatEventTime(event.startIso, event.allDay)}
              </Text>
            </View>
            {event.location ? (
              <Text style={[styles.eventMeta, { fontSize: Math.round(typography.titleSm.fontSize * scale) }]} numberOfLines={1}>
                {event.location}
              </Text>
            ) : null}
          </View>
        ))}
        {remainingEvents > 0 ? (
          <Text style={styles.moreLabel}>+{remainingEvents} more events</Text>
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
  },
  count: {
    ...typography.displaySm,
    color: colors.textPrimary,
    textAlign: "center",
  },
  eventsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  eventRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  metaRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  eventTitle: {
    ...typography.titleMd,
    color: colors.textPrimary,
    textAlign: "center",
    maxWidth: "100%",
  },
  eventMeta: {
    ...typography.titleSm,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: "100%",
  },
  moreLabel: {
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

function formatEventTime(iso: string, allDay: boolean): string {
  if (allDay) {
    return "All day";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
