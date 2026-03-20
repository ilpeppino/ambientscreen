import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type {
  WeatherWidgetData,
  WidgetRendererProps,
} from "@ambient/shared-contracts";
import { DisplayFrame } from "../../shared/ui/layout/DisplayFrame";

export function WeatherRenderer({ data }: WidgetRendererProps<WeatherWidgetData>) {
  return (
    <DisplayFrame title="Weather" subtitle={data?.location ?? "Weather"}>
      <View style={styles.container}>
        <Text style={styles.message}>Weather widget coming soon.</Text>
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
