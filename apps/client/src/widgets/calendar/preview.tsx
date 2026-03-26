import React from "react";
import { StyleSheet, View } from "react-native";
import type { WidgetPreviewProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, radius, spacing } from "../../shared/ui/theme";

// Static mock events — no network calls in preview
const MOCK_EVENTS = [
  { id: "1", title: "Team Standup", time: "Mon 9:00 AM", allDay: false },
  { id: "2", title: "Design Review", time: "Mon 2:00 PM", allDay: false },
  { id: "3", title: "All-hands", time: "All day", allDay: true },
];

export function CalendarPreview(_props: WidgetPreviewProps<"calendar">) {
  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <AppIcon name="calendar" size="md" color="textSecondary" />
        <Text style={styles.count}>{MOCK_EVENTS.length} upcoming</Text>
      </View>
      <View style={styles.eventsList}>
        {MOCK_EVENTS.map((event) => (
          <View key={event.id} style={styles.eventRow}>
            <Text style={styles.eventTitle} numberOfLines={1}>
              {event.title}
            </Text>
            <Text style={styles.eventTime}>{event.time}</Text>
          </View>
        ))}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    padding: spacing.md,
    width: "100%",
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    marginBottom: spacing.sm,
  },
  count: {
    fontSize: 16,
    fontWeight: "700",
    color: colors.textPrimary,
  },
  eventsList: {
    width: "100%",
    gap: spacing.xs,
  },
  eventRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  eventTitle: {
    fontSize: 12,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  eventTime: {
    fontSize: 11,
    color: colors.textSecondary,
    marginTop: 2,
  },
});
