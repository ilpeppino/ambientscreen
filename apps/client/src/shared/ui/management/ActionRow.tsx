import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon, type AppIconName } from "../components";
import { Text } from "../components/Text";
import { colors, radius, spacing } from "../theme";

export type ManagementActionTone = "primary" | "secondary" | "destructive" | "passive";

interface ManagementActionButtonProps {
  label: string;
  tone?: ManagementActionTone;
  icon?: AppIconName;
  disabled?: boolean;
  loading?: boolean;
  onPress: () => void;
  fullWidth?: boolean;
}

interface ActionRowProps {
  children: React.ReactNode;
}

const toneStyles = {
  primary: {
    button: { backgroundColor: colors.accentBlue, borderColor: colors.accentBlue },
    label: { color: colors.textPrimary },
    iconColor: "textPrimary" as const,
  },
  secondary: {
    button: { backgroundColor: colors.buttonSecondaryBg, borderColor: colors.buttonSecondaryBorder },
    label: { color: colors.buttonSecondaryText },
    iconColor: "textPrimary" as const,
  },
  destructive: {
    button: { backgroundColor: colors.statusDangerBg, borderColor: colors.statusDangerBorderAlt },
    label: { color: colors.statusDangerText },
    iconColor: "error" as const,
  },
  passive: {
    button: { backgroundColor: colors.buttonPassiveBg, borderColor: colors.buttonPassiveBorder },
    label: { color: colors.buttonPassiveText },
    iconColor: "textSecondary" as const,
  },
};

export function ActionRow({ children }: ActionRowProps) {
  return <View style={styles.row}>{children}</View>;
}

export function ManagementActionButton({
  label,
  tone = "secondary",
  icon,
  disabled,
  loading,
  onPress,
  fullWidth,
}: ManagementActionButtonProps) {
  const style = toneStyles[tone];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      style={[
        styles.button,
        style.button,
        fullWidth ? styles.fullWidth : null,
        (disabled || loading) ? styles.buttonDisabled : null,
      ]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      {icon ? <AppIcon name={icon} size="sm" color={style.iconColor} /> : null}
      <Text style={[styles.label, style.label]}>{loading ? `${label}...` : label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
    alignItems: "center",
  },
  button: {
    minHeight: 38,
    borderWidth: 1,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  fullWidth: {
    flex: 1,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  label: {
    fontSize: 13,
    fontWeight: "700",
  },
});
