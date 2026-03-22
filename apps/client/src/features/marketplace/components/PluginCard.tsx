import React from "react";
import { StyleSheet, Switch, Text, View } from "react-native";
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
            trackColor={{ false: "#3d3d3d", true: "#2d8cff" }}
            thumbColor={plugin.isEnabled ? "#fff" : "#888"}
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
    borderBottomColor: "#242934",
    paddingBottom: 6,
  },
  metaLabel: {
    color: "#8b95a7",
    fontSize: 12,
    fontWeight: "600",
  },
  metaValue: {
    color: "#d4dbe7",
    fontSize: 12,
  },
  lockedRow: {
    borderWidth: 1,
    borderColor: "#6b5318",
    borderRadius: 10,
    backgroundColor: "#2d250f",
    paddingVertical: 8,
    paddingHorizontal: 10,
  },
  lockedText: {
    color: "#f5a623",
    fontSize: 12,
    fontWeight: "600",
  },
  toggleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingTop: 4,
  },
  toggleLabel: {
    color: "#d4dbe7",
    fontSize: 13,
    fontWeight: "600",
  },
});
