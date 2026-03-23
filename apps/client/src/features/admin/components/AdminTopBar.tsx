import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { InlineStatusBadge } from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";

interface AdminTopBarProps {
  activeProfileName: string | null;
  plan: "free" | "pro";
  onOpenSettings: () => void;
  onEnterDisplayMode: () => void;
  onEnterMarketplace: () => void;
}

export function AdminTopBar({
  activeProfileName,
  plan,
  onOpenSettings,
  onEnterDisplayMode,
  onEnterMarketplace,
}: AdminTopBarProps) {
  return (
    <View style={styles.bar}>
      <View style={styles.left}>
        <Text style={styles.title}>Dashboard Editor</Text>
        {activeProfileName ? (
          <Text style={styles.profileLabel}>{activeProfileName}</Text>
        ) : null}
      </View>
      <View style={styles.right}>
        <InlineStatusBadge
          label={plan === "pro" ? "Pro" : "Free"}
          tone={plan === "pro" ? "premium" : "neutral"}
          icon={plan === "pro" ? "star" : "grid"}
        />
        <Pressable
          accessibilityRole="button"
          style={styles.actionButton}
          onPress={onEnterMarketplace}
        >
          <Text style={styles.actionLabel}>Marketplace</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={onEnterDisplayMode}
        >
          <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Display</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          style={styles.settingsButton}
          onPress={onOpenSettings}
        >
          <Text style={styles.settingsLabel}>Settings</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  profileLabel: {
    ...typography.small,
    color: colors.textSecondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 3,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    overflow: "hidden",
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPassiveBg,
  },
  actionButtonPrimary: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  actionLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  actionLabelPrimary: {
    color: colors.statusInfoText,
  },
  settingsButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInput,
  },
  settingsLabel: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
