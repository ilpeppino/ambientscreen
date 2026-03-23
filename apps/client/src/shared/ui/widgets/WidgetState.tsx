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
  compact?: boolean;
}

export function WidgetState({ type, message, compact = false }: WidgetStateProps) {
  const resolvedMessage = message ?? DEFAULT_MESSAGES[type];
  const iconSize = compact ? "md" : "lg";

  return (
    <View style={[styles.container, compact ? styles.containerCompact : null]}>
      {type === "loading" ? (
        <ActivityIndicator size="small" color={colors.textSecondary} />
      ) : null}
      {type === "error" ? <AppIcon name="close" size={iconSize} color="textSecondary" /> : null}
      {type === "empty" ? <AppIcon name="grid" size={iconSize} color="textSecondary" /> : null}
      <Text
        variant={compact ? "caption" : "body"}
        color={type === "error" ? "error" : "textSecondary"}
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
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.md,
    paddingVertical: spacing.sm,
  },
  containerCompact: {
    paddingVertical: spacing.xs,
  },
  message: {
    textAlign: "center",
    maxWidth: 320,
  },
});
