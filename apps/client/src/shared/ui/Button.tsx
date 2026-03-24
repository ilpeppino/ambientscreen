import React from "react";
import { ActivityIndicator, Pressable, StyleSheet } from "react-native";
import { AppIcon, type AppIconName, type AppIconSize } from "./components";
import { Text } from "./components/Text";
import { colors, radius, spacing } from "./theme";

export type ButtonVariant = "primary" | "secondary" | "danger" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

interface ButtonProps {
  label: string;
  onPress: () => void;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  icon?: AppIconName;
  fullWidth?: boolean;
}

const variantStyles = {
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
  danger: {
    button: { backgroundColor: colors.statusDangerBg, borderColor: colors.statusDangerBorderAlt },
    label: { color: colors.statusDangerText },
    iconColor: "error" as const,
  },
  ghost: {
    button: { backgroundColor: colors.buttonPassiveBg, borderColor: colors.buttonPassiveBorder },
    label: { color: colors.buttonPassiveText },
    iconColor: "textSecondary" as const,
  },
};

const sizeStyles: Record<ButtonSize, { button: object; fontSize: number; iconSize: AppIconSize }> = {
  sm: {
    button: { minHeight: 32, paddingHorizontal: spacing.sm, paddingVertical: 5 },
    fontSize: 12,
    iconSize: "sm",
  },
  md: {
    button: { minHeight: 38, paddingHorizontal: spacing.md, paddingVertical: spacing.sm },
    fontSize: 13,
    iconSize: "sm",
  },
  lg: {
    button: { minHeight: 46, paddingHorizontal: spacing.lg, paddingVertical: spacing.md },
    fontSize: 15,
    iconSize: "md",
  },
};

export function Button({
  label,
  onPress,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  icon,
  fullWidth = false,
}: ButtonProps) {
  const vStyle = variantStyles[variant];
  const sStyle = sizeStyles[size];
  const isDisabled = disabled || loading;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled }}
      style={[
        styles.base,
        vStyle.button,
        sStyle.button,
        fullWidth ? styles.fullWidth : null,
        isDisabled ? styles.disabled : null,
      ]}
      disabled={isDisabled}
      onPress={onPress}
    >
      {loading ? (
        <ActivityIndicator size="small" color={vStyle.label.color} />
      ) : (
        <>
          {icon ? <AppIcon name={icon} size={sStyle.iconSize} color={vStyle.iconColor} /> : null}
          <Text style={[styles.label, vStyle.label, { fontSize: sStyle.fontSize }]}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  base: {
    borderWidth: 1,
    borderRadius: radius.md,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: spacing.xs,
  },
  fullWidth: {
    flex: 1,
  },
  disabled: {
    opacity: 0.6,
  },
  label: {
    fontWeight: "700",
  },
});
