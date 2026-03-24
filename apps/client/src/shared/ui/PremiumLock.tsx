import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { AppIcon } from "./components";
import { colors, radius, spacing, typography } from "./theme";

interface PremiumLockProps {
  compact?: boolean;
}

/**
 * Visual indicator shown on premium features that the current user cannot access.
 * Use `compact` for inline/badge use.
 */
export function PremiumLock({ compact = false }: PremiumLockProps) {
  if (compact) {
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>PRO</Text>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <AppIcon name="lock" size="md" color="accent" />
      <Text style={styles.label}>Pro feature</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    color: colors.accent,
    fontSize: typography.caption.fontSize,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
  },
  badgeText: {
    color: colors.backgroundPrimary,
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
