import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CalendarWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { colors, spacing } from "../../shared/ui/theme";
import { WidgetHeader, WidgetState, WidgetSurface } from "../../shared/ui/widgets";

const MAX_VISIBLE_EVENTS = 3;

export function CalendarRenderer({ data }: WidgetRendererProps<CalendarWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <WidgetSurface style={styles.card}>
          <WidgetHeader mode="display" icon="calendar" title="Calendar" />
          <WidgetState type="empty" compact message="No calendar data was returned." />
        </WidgetSurface>
      </View>
    );
  }

  const visibleEvents = data.events.slice(0, MAX_VISIBLE_EVENTS);
  const remainingEvents = Math.max(data.events.length - visibleEvents.length, 0);

  return (
    <View style={styles.container}>
      <WidgetSurface style={styles.card}>
        <WidgetHeader mode="display" icon="calendar" title="Calendar" />
        <Text style={styles.count}>{data.upcomingCount} upcoming</Text>
        {visibleEvents.length > 0 ? (
          <View style={styles.eventsList}>
            {visibleEvents.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <Text style={styles.eventTitle} numberOfLines={1}>{event.title}</Text>
                <Text style={styles.eventMeta} numberOfLines={1}>{formatEventTime(event.startIso, event.allDay)}</Text>
                {event.location ? <Text style={styles.eventMeta} numberOfLines={1}>{event.location}</Text> : null}
              </View>
            ))}
            {remainingEvents > 0 ? (
              <Text style={styles.moreLabel}>+{remainingEvents} more events</Text>
            ) : null}
          </View>
        ) : (
          <WidgetState type="empty" compact message="No upcoming events." />
        )}
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
    maxWidth: 900,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.xl,
  },
  count: {
    fontSize: 40,
    lineHeight: 46,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  eventsList: {
    marginTop: spacing.md,
    gap: spacing.sm,
  },
  eventRow: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  eventTitle: {
    fontSize: 22,
    lineHeight: 28,
    color: colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
    maxWidth: "100%",
  },
  eventMeta: {
    marginTop: spacing.xs,
    fontSize: 17,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: "100%",
  },
  moreLabel: {
    marginTop: spacing.xs,
    fontSize: 14,
    lineHeight: 20,
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
