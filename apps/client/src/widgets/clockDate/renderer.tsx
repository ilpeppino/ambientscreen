import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  ClockDateWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";

export function ClockDateRenderer({ data }: WidgetRendererProps<ClockDateWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <Text style={styles.loadingText}>No clock data</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.time}>{data.formattedTime}</Text>
      {data.weekdayLabel ? (
        <Text style={styles.weekday}>{data.weekdayLabel}</Text>
      ) : null}
      {data.formattedDate ? (
        <Text style={styles.date}>{data.formattedDate}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000",
  },
  time: {
    fontSize: 64,
    fontWeight: "700",
    color: "#fff",
  },
  weekday: {
    marginTop: 12,
    fontSize: 28,
    color: "#ddd",
  },
  date: {
    marginTop: 8,
    fontSize: 24,
    color: "#bbb",
  },
  loadingText: {
    fontSize: 20,
    color: "#fff",
  },
});
