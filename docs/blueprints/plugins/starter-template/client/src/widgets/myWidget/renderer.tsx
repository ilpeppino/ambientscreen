// ============================================================
// STEP 5: Client Renderer
//
// Copy to:
//   apps/client/src/widgets/myWidget/renderer.tsx
//
// Purely presentational. No business logic, no data fetching.
// Must handle data === null (empty / error states).
// ============================================================

import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { MyWidgetData, WidgetRendererProps } from "@ambient/shared-contracts";

export function MyWidgetRenderer({ data, state, config }: WidgetRendererProps<MyWidgetData>) {
  // Always guard against null data — it arrives for "empty" and "error" states.
  if (!data) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.fallback}>
            {state === "empty" ? "Nothing to display." : "Data unavailable."}
          </Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        {/* Use config values to drive display variations */}
        {config.showLabel && (
          <Text style={styles.label}>{config.title}</Text>
        )}

        {/* Main value — from the API resolver */}
        <Text style={styles.value}>{data.value}</Text>

        {config.displayMode === "full" && (
          <Text style={styles.timestamp}>Updated: {data.fetchedAt}</Text>
        )}
      </View>
    </View>
  );
}

// Follow dark-theme conventions used across all built-in renderers.
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
  label: {
    fontSize: 16,
    color: "#bfbfbf",
    marginBottom: 12,
    textTransform: "uppercase",
    letterSpacing: 2,
    textAlign: "center",
  },
  value: {
    fontSize: 48,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  timestamp: {
    marginTop: 12,
    fontSize: 14,
    color: "#666",
    textAlign: "center",
  },
  fallback: {
    fontSize: 22,
    color: "#d5d5d5",
    textAlign: "center",
  },
});
