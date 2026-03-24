import React from "react";
import { StyleSheet, View } from "react-native";
import { Button } from "./Button";
import { AppIcon } from "./components";
import { Text } from "./components/Text";
import { colors, radius, spacing, typography } from "./theme";

interface ErrorStateProps {
  message: string;
  onRetry?: () => void;
  compact?: boolean;
}

export function ErrorState({ message, onRetry, compact = false }: ErrorStateProps) {
  return (
    <View style={[styles.container, compact ? styles.containerCompact : null]}>
      <AppIcon name="alert" size={compact ? "md" : "lg"} color="error" />
      <Text style={[styles.title, compact ? styles.titleCompact : null]}>Something went wrong</Text>
      <Text style={[styles.message, compact ? styles.messageCompact : null]}>{message}</Text>
      {onRetry ? (
        <Button
          label="Retry"
          variant="secondary"
          size={compact ? "sm" : "md"}
          icon="refresh"
          onPress={onRetry}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.statusDangerBorder,
    borderRadius: radius.lg,
    backgroundColor: colors.statusDangerBg,
    padding: spacing.lg,
    gap: spacing.sm,
    alignItems: "center",
  },
  containerCompact: {
    padding: spacing.md,
    gap: spacing.xs,
  },
  title: {
    ...typography.heading,
    color: colors.statusDangerText,
  },
  titleCompact: {
    ...typography.titleSm,
  },
  message: {
    ...typography.small,
    color: colors.statusDangerText,
    textAlign: "center",
    lineHeight: 20,
  },
  messageCompact: {
    lineHeight: 18,
  },
});
