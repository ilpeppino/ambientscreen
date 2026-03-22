import React from "react";
import { ActivityIndicator, Pressable, StyleSheet, Switch, Text, View } from "react-native";
import { PremiumLock } from "../../../shared/ui/PremiumLock";
import type { MarketplacePlugin } from "../marketplace.types";

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
    <View style={[styles.card, anyLocked && styles.cardLocked]}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <Text style={styles.name}>{plugin.name}</Text>
          {plugin.isPremium ? <PremiumLock compact /> : null}
        </View>
        <Text style={styles.category}>{plugin.category}</Text>
      </View>

      <Text style={styles.description} numberOfLines={2}>
        {plugin.description}
      </Text>

      {plugin.activeVersion ? (
        <Text style={styles.version}>v{plugin.activeVersion.version}</Text>
      ) : null}

      {isInstallationLocked ? (
        <View style={styles.lockedRow}>
          <Text style={styles.lockedText}>
            {isPremiumLocked
              ? "Pro plan required (Premium plugin)"
              : "Upgrade to Pro to install plugins"}
          </Text>
        </View>
      ) : isPremiumLocked ? (
        <View style={styles.lockedRow}>
          <Text style={styles.lockedText}>Premium plan required for this plugin</Text>
        </View>
      ) : (
        <View style={styles.actions}>
          {plugin.isInstalled ? (
            <>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>
                  {plugin.isEnabled ? "Enabled" : "Disabled"}
                </Text>
                <Switch
                  value={plugin.isEnabled}
                  onValueChange={onToggleEnabled}
                  disabled={actionInProgress}
                  trackColor={{ false: "#3d3d3d", true: "#2d8cff" }}
                  thumbColor={plugin.isEnabled ? "#fff" : "#888"}
                />
              </View>
              <Pressable
                accessibilityRole="button"
                style={[styles.uninstallButton, actionInProgress && styles.buttonDisabled]}
                onPress={onUninstall}
                disabled={actionInProgress}
              >
                {actionInProgress ? (
                  <ActivityIndicator size="small" color="#ff6b6b" />
                ) : (
                  <Text style={styles.uninstallButtonLabel}>Uninstall</Text>
                )}
              </Pressable>
            </>
          ) : (
            <Pressable
              accessibilityRole="button"
              style={[styles.installButton, actionInProgress && styles.buttonDisabled]}
              onPress={onInstall}
              disabled={actionInProgress}
            >
              {actionInProgress ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <Text style={styles.installButtonLabel}>Install</Text>
              )}
            </Pressable>
          )}

          <Pressable
            accessibilityRole="button"
            style={styles.detailsButton}
            onPress={onViewDetails}
          >
            <Text style={styles.detailsButtonLabel}>Details</Text>
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    borderWidth: 1,
    borderColor: "#2d2d2d",
    borderRadius: 12,
    padding: 16,
    backgroundColor: "#111",
    gap: 10,
  },
  cardLocked: {
    opacity: 0.8,
    borderColor: "#f5a62333",
  },
  header: {
    gap: 4,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  name: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "700",
  },
  category: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  description: {
    color: "#bbb",
    fontSize: 13,
    lineHeight: 18,
  },
  version: {
    color: "#555",
    fontSize: 11,
  },
  lockedRow: {
    backgroundColor: "#1a1400",
    borderRadius: 6,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: "#f5a62333",
  },
  lockedText: {
    color: "#f5a623",
    fontSize: 12,
    fontWeight: "600",
  },
  actions: {
    flexDirection: "row",
    gap: 8,
    alignItems: "center",
  },
  toggleRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  toggleLabel: {
    color: "#aaa",
    fontSize: 13,
  },
  installButton: {
    flex: 1,
    backgroundColor: "#2d8cff",
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: "center",
  },
  installButtonLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "700",
  },
  uninstallButton: {
    borderWidth: 1,
    borderColor: "#662222",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    alignItems: "center",
  },
  uninstallButtonLabel: {
    color: "#ff6b6b",
    fontSize: 13,
    fontWeight: "600",
  },
  detailsButton: {
    borderWidth: 1,
    borderColor: "#444",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
  },
  detailsButtonLabel: {
    color: "#aaa",
    fontSize: 13,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
