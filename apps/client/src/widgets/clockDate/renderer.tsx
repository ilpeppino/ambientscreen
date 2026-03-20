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
        <View style={styles.card}>
          <Text style={styles.loadingText}>No clock data available.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.time}>{data.formattedTime}</Text>
        {data.weekdayLabel ? (
          <Text style={styles.weekday}>{data.weekdayLabel}</Text>
        ) : null}
        {data.formattedDate ? (
          <Text style={styles.date}>{data.formattedDate}</Text>
        ) : null}
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
    maxWidth: 720,
    borderWidth: 1,
    borderColor: "#1c1c1c",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    borderRadius: 24,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 36,
  },
  time: {
    fontSize: 108,
    fontWeight: "700",
    color: "#fff",
    letterSpacing: 1.2,
    textAlign: "center",
  },
  weekday: {
    marginTop: 14,
    fontSize: 30,
    color: "#efefef",
    letterSpacing: 2,
    textTransform: "uppercase",
    textAlign: "center",
  },
  date: {
    marginTop: 10,
    fontSize: 28,
    color: "#bfbfbf",
    textAlign: "center",
  },
  loadingText: {
    fontSize: 22,
    color: "#d5d5d5",
    textAlign: "center",
  },
});
