import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, spacing } from "../../../shared/ui/theme";

export type AsyncStatus = "loading" | "empty" | "error";

interface InspectorAsyncStateProps {
  status: AsyncStatus;
  emptyMessage?: string;
  errorMessage?: string;
}

export function InspectorAsyncState({
  status,
  emptyMessage,
  errorMessage,
}: InspectorAsyncStateProps) {
  if (status === "loading") {
    return (
      <View style={styles.row}>
        <ActivityIndicator size="small" color={colors.textSecondary} />
        <Text style={styles.text}>Loading…</Text>
      </View>
    );
  }

  if (status === "error") {
    return (
      <Text style={styles.error}>{errorMessage ?? "Something went wrong."}</Text>
    );
  }

  return (
    <Text style={styles.text}>{emptyMessage ?? "No items found."}</Text>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  text: {
    fontSize: 13,
    color: colors.textSecondary,
  },
  error: {
    fontSize: 13,
    color: colors.error,
  },
});
