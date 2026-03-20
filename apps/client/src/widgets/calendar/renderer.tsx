import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CalendarWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";

export function CalendarRenderer({ data }: WidgetRendererProps<CalendarWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.statusTitle}>Calendar unavailable</Text>
          <Text style={styles.statusMessage}>No calendar data was returned.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
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
          <Text style={styles.statusMessage}>No upcoming events.</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 20,
    paddingVertical: 24,
    backgroundColor: "transparent",
  },
  card: {
    width: "100%",
    maxWidth: 900,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 24,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  statusTitle: {
    fontSize: 30,
    lineHeight: 36,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  statusMessage: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 24,
    color: "#bdbdbd",
    textAlign: "center",
  },
  count: {
    fontSize: 36,
    lineHeight: 42,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  eventsList: {
    marginTop: 16,
  },
  eventRow: {
    borderRadius: 14,
    borderWidth: 1,
    borderColor: "#242424",
    backgroundColor: "rgba(0, 0, 0, 0.28)",
    paddingHorizontal: 16,
    paddingVertical: 12,
    alignItems: "center",
    marginBottom: 10,
  },
  eventTitle: {
    fontSize: 24,
    lineHeight: 30,
    color: "#f3f3f3",
    fontWeight: "600",
    textAlign: "center",
  },
  eventMeta: {
    marginTop: 4,
    fontSize: 16,
    lineHeight: 22,
    color: "#bdbdbd",
    textAlign: "center",
  },
});
