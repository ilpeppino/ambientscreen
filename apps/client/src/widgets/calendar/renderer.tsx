import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CalendarWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { colors, spacing } from "../../shared/ui/theme";
import { WidgetHeader, WidgetState, WidgetSurface } from "../../shared/ui/widgets";

export function CalendarRenderer({ data }: WidgetRendererProps<CalendarWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <WidgetSurface style={styles.card}>
          <WidgetHeader icon="calendar" title="Calendar" />
          <WidgetState type="empty" message="No calendar data was returned." />
        </WidgetSurface>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <WidgetSurface style={styles.card}>
        <WidgetHeader icon="calendar" title="Calendar" />
        <Text style={styles.count}>{data.upcomingCount} upcoming</Text>
        {data.events.length > 0 ? (
          <View style={styles.eventsList}>
            {data.events.map((event) => (
              <View key={event.id} style={styles.eventRow}>
                <Text style={styles.eventTitle}>{event.title}</Text>
                <Text style={styles.eventMeta}>{event.startIso}</Text>
                {event.location ? (
                  <Text style={styles.eventMeta}>{event.location}</Text>
                ) : null}
              </View>
            ))}
          </View>
        ) : (
          <WidgetState type="empty" message="No upcoming events." />
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
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  count: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
  eventsList: {
    marginTop: spacing.lg,
  },
  eventRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.surface,
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
    marginBottom: spacing.sm,
  },
  eventTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: colors.textPrimary,
    fontWeight: "600",
    textAlign: "center",
  },
  eventMeta: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    color: colors.textSecondary,
    textAlign: "center",
  },
});
