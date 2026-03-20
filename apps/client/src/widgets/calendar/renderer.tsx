import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CalendarWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";

export function CalendarRenderer({ data }: WidgetRendererProps<CalendarWidgetData>) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>Calendar widget coming soon.</Text>
      {data ? <Text style={styles.count}>{data.upcomingCount} events</Text> : null}
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
  message: {
    fontSize: 20,
    color: "#fff",
    textAlign: "center",
  },
  count: {
    marginTop: 12,
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
  },
});
