import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import {
  ActionRow,
  InlineStatusBadge,
  ManagementActionButton,
  ManagementCard,
} from "../../../shared/ui/management";
import type { MarketplacePlugin } from "../marketplace.types";
import { InstallActionButton } from "./InstallActionButton";

interface PluginCardProps {
  plugin: MarketplacePlugin;
  actionInProgress: boolean;
  isPremiumLocked: boolean;
  isInstallationLocked: boolean;
  onInstall: () => void;
  onUninstall: () => void;
  onToggleEnabled: (isEnabled: boolean) => void;
  onViewDetails: () => void;
}

function renderBadges(plugin: MarketplacePlugin) {
  return (
    <>
      <InlineStatusBadge
        label={plugin.isInstalled ? "Installed" : "Not installed"}
        tone={plugin.isInstalled ? "success" : "neutral"}
        icon={plugin.isInstalled ? "check" : "close"}
      />
      <InlineStatusBadge
        label={plugin.isPremium ? "Premium" : "Free"}
        tone={plugin.isPremium ? "premium" : "info"}
        icon={plugin.isPremium ? "star" : "grid"}
      />
      {plugin.isInstalled ? (
        <InlineStatusBadge
          label={plugin.isEnabled ? "Enabled" : "Disabled"}
          tone={plugin.isEnabled ? "success" : "warning"}
          icon={plugin.isEnabled ? "check" : "close"}
        />
      ) : null}
    </>
  );
}

export function PluginCard({
  plugin,
  actionInProgress,
  isPremiumLocked,
  isInstallationLocked,
  onInstall,
  onUninstall,
  onToggleEnabled,
  onViewDetails,
}: PluginCardProps) {
  const anyLocked = isPremiumLocked || isInstallationLocked;

  return (
    <ManagementCard
      title={plugin.name}
      subtitle={plugin.description}
      icon={plugin.category === "weather" ? "weather" : plugin.category === "calendar" ? "calendar" : "grid"}
      badges={renderBadges(plugin)}
      disabled={anyLocked}
      footer={
        <ActionRow>
          <InstallActionButton
            isInstalled={plugin.isInstalled}
            isPremiumLocked={isPremiumLocked}
            isInstallationLocked={isInstallationLocked}
            loading={actionInProgress}
            onInstall={onInstall}
            onUninstall={onUninstall}
          />

          <ManagementActionButton
            label="View details"
            tone="passive"
            icon="chevronRight"
            onPress={onViewDetails}
          />
        </ActionRow>
      }
    >
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Category</Text>
        <Text style={styles.metaValue}>{plugin.category}</Text>
      </View>
      <View style={styles.metaRow}>
        <Text style={styles.metaLabel}>Version</Text>
        <Text style={styles.metaValue}>{plugin.activeVersion ? `v${plugin.activeVersion.version}` : "N/A"}</Text>
      </View>
      {isInstallationLocked || isPremiumLocked ? (
        <View style={styles.lockedRow}>
          <Text style={styles.lockedText}>
            {isPremiumLocked
              ? "Pro plan required for this premium plugin"
              : "Upgrade to Pro to install plugins"}
          </Text>
        </View>
      ) : plugin.isInstalled ? (
        <View style={styles.toggleRow}>
          <Text style={styles.toggleLabel}>Enabled</Text>
          <Switch
            value={plugin.isEnabled}
            onValueChange={onToggleEnabled}
            disabled={actionInProgress}
            trackColor={{ false: colors.border, true: colors.accentBlue }}
            thumbColor={plugin.isEnabled ? colors.textPrimary : colors.textSecondary}
          />
        </View>
      ) : null}
    </ManagementCard>
  );
}

const styles = StyleSheet.create({
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    paddingBottom: 6,
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: typography.caption.fontSize,
  },
  lockedRow: {
    borderWidth: 1,
    borderColor: colors.statusPremiumBorder,
    borderRadius: radius.sm,
    backgroundColor: colors.statusPremiumBg,
    paddingVertical: spacing.sm,
    paddingHorizontal: 10,
  },
  lockedText: {
    color: colors.accent,
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: typography.small.fontSize,
    fontWeight: "600",
  },
});
