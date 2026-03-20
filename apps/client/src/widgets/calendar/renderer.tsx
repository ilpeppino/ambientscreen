import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  CalendarWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { DisplayFrame } from "../../shared/ui/layout/DisplayFrame";

export function CalendarRenderer({ data }: WidgetRendererProps<CalendarWidgetData>) {
  return (
    <DisplayFrame title="Calendar" subtitle={data ? `${data.upcomingCount} events` : "Calendar"}>
      <View style={styles.container}>
        <Text style={styles.message}>Calendar widget coming soon.</Text>
      </View>
    </DisplayFrame>
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
});
