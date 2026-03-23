import React from "react";
import { ActivityIndicator, StyleSheet, View } from "react-native";
import { AppIcon, type AppIconName } from "../components";
import { Text } from "../components/Text";
import { colors, radius, spacing, typography } from "../theme";
import { ManagementActionButton } from "./ActionRow";

export type EmptyPanelVariant = "empty" | "loading" | "error";

interface EmptyPanelProps {
  title: string;
  message: string;
  variant?: EmptyPanelVariant;
  icon?: AppIconName;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyPanel({
  title,
  message,
  variant = "empty",
  icon = variant === "error" ? "close" : "grid",
  actionLabel,
  onAction,
}: EmptyPanelProps) {
  return (
    <View style={styles.container}>
      {variant === "loading" ? (
        <ActivityIndicator size="large" color={colors.accentBlue} />
      ) : (
        <AppIcon name={icon} size="lg" color={variant === "error" ? "error" : "textSecondary"} />
      )}
      <Text style={styles.title}>{title}</Text>
      <Text style={styles.message}>{message}</Text>
      {actionLabel && onAction ? (
        <ManagementActionButton label={actionLabel} tone={variant === "error" ? "secondary" : "passive"} onPress={onAction} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    padding: spacing.xl,
    gap: spacing.sm,
    alignItems: "center",
  },
  title: {
    ...typography.heading,
    color: colors.textPrimary,
  },
  message: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 19,
  },
});
