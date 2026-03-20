import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { ClockDateWidgetData } from "../../services/api/widgetDataApi";
import { DisplayFrame } from "../../shared/ui/layout/DisplayFrame";

interface ClockDateRendererProps {
  data: ClockDateWidgetData | null;
}

export function ClockDateRenderer({ data }: ClockDateRendererProps) {
  if (!data) {
    return (
      <DisplayFrame title="Clock">
        <View style={styles.container}>
          <Text style={styles.loadingText}>No clock data</Text>
        </View>
      </DisplayFrame>
    );
  }

  return (
    <DisplayFrame
      title="Clock"
      subtitle={data.nowIso}
      footer={<Text style={styles.footerText}>Ambient Screen</Text>}
    >
      <View style={styles.container}>
        <Text style={styles.time}>{data.formattedTime}</Text>
        {data.weekdayLabel ? (
          <Text style={styles.weekday}>{data.weekdayLabel}</Text>
        ) : null}
        {data.formattedDate ? (
          <Text style={styles.date}>{data.formattedDate}</Text>
        ) : null}
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
  footerText: {
    color: "#666",
    fontSize: 12,
  },
});