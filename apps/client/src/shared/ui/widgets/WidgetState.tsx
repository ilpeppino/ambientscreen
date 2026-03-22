import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppIcon } from "../components/AppIcon";
import { Text } from "../components/Text";
import { colors, spacing } from "../theme";

export type WidgetStateType = "loading" | "error" | "empty";

const DEFAULT_MESSAGES: Record<WidgetStateType, string> = {
  loading: "Loading…",
  error: "Something went wrong",
  empty: "No data available",
};

interface WidgetStateProps {
  type: WidgetStateType;
  message?: string;
}

export function WidgetState({ type, message }: WidgetStateProps) {
  const resolvedMessage = message ?? DEFAULT_MESSAGES[type];

  return (
    <View style={styles.container}>
      {type === "loading" ? (
        <ActivityIndicator size="large" color={colors.textPrimary} />
      ) : null}
      {type === "error" ? <AppIcon name="close" size="lg" color="error" /> : null}
      {type === "empty" ? <AppIcon name="grid" size="lg" color="textSecondary" /> : null}
      <Text
        variant="body"
        color={type === "error" ? "error" : type === "empty" ? "textSecondary" : "textPrimary"}
        style={styles.message}
      >
        {resolvedMessage}
      </Text>
    </View>
  );
}

export function getWidgetStateMessage(type: WidgetStateType, message?: string): string {
  return message ?? DEFAULT_MESSAGES[type];
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    minHeight: 140,
  },
  message: {
    textAlign: "center",
  },
});
