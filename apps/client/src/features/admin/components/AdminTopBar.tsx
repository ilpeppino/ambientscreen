import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { AppIcon } from "../../../shared/ui/components";
import { InlineStatusBadge } from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";

interface AdminTopBarProps {
  activeProfileName: string | null;
  plan: "free" | "pro";
  onOpenSettings: () => void;
  onEnterDisplayMode: () => void;
  onEnterRemoteControlMode: () => void;
  onEnterMarketplace: () => void;
  onLogout: () => void;
  onClearCanvas: () => void;
  clearCanvasDisabled?: boolean;
  clearingCanvas?: boolean;
}

export function AdminTopBar({
  activeProfileName,
  plan,
  onOpenSettings,
  onEnterDisplayMode,
  onEnterRemoteControlMode,
  onEnterMarketplace,
  onLogout,
  onClearCanvas,
  clearCanvasDisabled = false,
  clearingCanvas = false,
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
        <View style={styles.separator} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Marketplace"
          style={styles.actionButton}
          onPress={onEnterMarketplace}
        >
          <AppIcon name="star" size="sm" color="textSecondary" />
          <Text style={styles.actionLabel}>Marketplace</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Clear Canvas"
          style={[
            styles.actionButton,
            styles.actionButtonDestructive,
            clearCanvasDisabled ? styles.actionDisabled : null,
          ]}
          onPress={onClearCanvas}
          disabled={clearCanvasDisabled}
        >
          <AppIcon name="trash" size="sm" color="statusDangerText" />
          <Text style={styles.actionLabelDestructive}>
            {clearingCanvas ? "Clearing…" : "Clear Canvas"}
          </Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Remote Control"
          style={styles.actionButton}
          onPress={onEnterRemoteControlMode}
        >
          <AppIcon name="refresh" size="sm" color="textSecondary" />
          <Text style={styles.actionLabel}>Remote</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Display Mode"
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={onEnterDisplayMode}
        >
          <AppIcon name="grid" size="sm" color="statusInfoText" />
          <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Display</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Logout"
          style={styles.actionButton}
          onPress={onLogout}
        >
          <AppIcon name="close" size="sm" color="textSecondary" />
          <Text style={styles.actionLabel}>Logout</Text>
        </Pressable>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Settings"
          style={styles.settingsButton}
          onPress={onOpenSettings}
        >
          <AppIcon name="settings" size="sm" color="textPrimary" />
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
  separator: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
  actionButtonDestructive: {
    borderColor: colors.statusDangerBorderAlt,
    backgroundColor: colors.statusDangerBg,
  },
  actionDisabled: {
    opacity: 0.55,
  },
  actionLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  actionLabelPrimary: {
    color: colors.statusInfoText,
  },
  actionLabelDestructive: {
    ...typography.small,
    color: colors.statusDangerText,
    fontWeight: "700",
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
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
