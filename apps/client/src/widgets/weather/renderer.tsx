import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  WeatherWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";

export function WeatherRenderer({ data }: WidgetRendererProps<WeatherWidgetData>) {
  return (
    <View style={styles.container}>
      <Text style={styles.message}>Weather widget coming soon.</Text>
      {data?.location ? <Text style={styles.location}>{data.location}</Text> : null}
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
  location: {
    marginTop: 12,
    fontSize: 16,
    color: "#aaa",
    textAlign: "center",
  },
});
