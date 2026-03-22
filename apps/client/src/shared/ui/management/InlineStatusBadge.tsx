import React from "react";
import { StyleSheet, View } from "react-native";
import { AppIcon, type AppIconName } from "../components";
import { Text } from "../components/Text";
import { colors, radius, spacing } from "../theme";

export type InlineStatusTone =
  | "neutral"
  | "success"
  | "warning"
  | "danger"
  | "premium"
  | "info";

interface InlineStatusBadgeProps {
  label: string;
  tone?: InlineStatusTone;
  icon?: AppIconName;
}

const toneStyles = {
  neutral: {
    container: { backgroundColor: "#111827", borderColor: "#1f2937" },
    label: { color: colors.textSecondary },
    iconColor: "textSecondary" as const,
  },
  success: {
    container: { backgroundColor: "#0f2a1d", borderColor: "#1f5e42" },
    label: { color: "#86efac" },
    iconColor: "textPrimary" as const,
  },
  warning: {
    container: { backgroundColor: "#332508", borderColor: "#664d17" },
    label: { color: "#f5d27a" },
    iconColor: "accent" as const,
  },
  danger: {
    container: { backgroundColor: "#301414", borderColor: "#5f2424" },
    label: { color: "#fecaca" },
    iconColor: "error" as const,
  },
  premium: {
    container: { backgroundColor: "#2d250f", borderColor: "#6b5318" },
    label: { color: colors.accent },
    iconColor: "accent" as const,
  },
  info: {
    container: { backgroundColor: "#112239", borderColor: "#244e84" },
    label: { color: "#93c5fd" },
    iconColor: "textPrimary" as const,
  },
};

export function InlineStatusBadge({ label, tone = "neutral", icon }: InlineStatusBadgeProps) {
  const variant = toneStyles[tone];

  return (
    <View style={[styles.container, variant.container]}>
      {icon ? <AppIcon name={icon} size="sm" color={variant.iconColor} /> : null}
      <Text style={[styles.label, variant.label]}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
  },
  label: {
    fontSize: 12,
    fontWeight: "700",
  },
});
