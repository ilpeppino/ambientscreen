import React, { useEffect, useState } from "react";
import {
  ActivityIndicator,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { getRegistryPluginByKey, type RegistryPluginDetail } from "../../../services/api/pluginRegistryApi";
import { PremiumLock } from "../../../shared/ui/PremiumLock";
import type { MarketplacePlugin } from "../marketplace.types";

interface PluginDetailModalProps {
  plugin: MarketplacePlugin | null;
  actionInProgress: boolean;
  isPremiumLocked: boolean;
  isInstallationLocked: boolean;
  onClose: () => void;
  onInstall: () => void;
  onUninstall: () => void;
  onToggleEnabled: (isEnabled: boolean) => void;
}

export function PluginDetailModal({
  plugin,
  actionInProgress,
  isPremiumLocked,
  isInstallationLocked,
  onClose,
  onInstall,
  onUninstall,
  onToggleEnabled,
}: PluginDetailModalProps) {
  const [detail, setDetail] = useState<RegistryPluginDetail | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState<string | null>(null);

  useEffect(() => {
    if (!plugin) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setDetailLoading(true);
    setDetailError(null);

    getRegistryPluginByKey(plugin.key)
      .then((data) => {
        if (!cancelled) {
          setDetail(data);
          setDetailLoading(false);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setDetailError(err instanceof Error ? err.message : "Failed to load plugin details");
          setDetailLoading(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [plugin?.key]);

  return (
    <Modal
      visible={plugin !== null}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" style={styles.closeButton} onPress={onClose}>
            <Text style={styles.closeButtonLabel}>Close</Text>
          </Pressable>
        </View>

        {detailLoading ? (
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#fff" />
          </View>
        ) : detailError ? (
          <View style={styles.centered}>
            <Text style={styles.errorText}>{detailError}</Text>
          </View>
        ) : plugin ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <View style={styles.titleRow}>
              <Text style={styles.name}>{plugin.name}</Text>
              {plugin.isPremium ? <PremiumLock compact /> : null}
            </View>

            <Text style={styles.category}>{plugin.category}</Text>

            {plugin.activeVersion ? (
              <Text style={styles.version}>Version {plugin.activeVersion.version}</Text>
            ) : (
              <Text style={styles.version}>No active version</Text>
            )}

            <Text style={styles.sectionLabel}>Description</Text>
            <Text style={styles.description}>{plugin.description}</Text>

            {detail?.activeVersion?.changelog ? (
              <>
                <Text style={styles.sectionLabel}>Changelog</Text>
                <Text style={styles.changelog}>{detail.activeVersion.changelog}</Text>
              </>
            ) : null}

            <View style={styles.statusRow}>
              <Text style={styles.statusLabel}>Status</Text>
              <Text style={[styles.statusValue, plugin.isInstalled && styles.statusInstalled]}>
                {plugin.isInstalled
                  ? plugin.isEnabled
                    ? "Installed & Enabled"
                    : "Installed (Disabled)"
                  : "Not Installed"}
              </Text>
            </View>

            {isInstallationLocked ? (
              <View style={styles.lockedBanner}>
                <Text style={styles.lockedBannerText}>
                  {isPremiumLocked
                    ? "Plugin installation and premium widgets require a Pro plan. Upgrade to access this plugin."
                    : "Plugin installation requires a Pro plan. Upgrade to install plugins."}
                </Text>
              </View>
            ) : isPremiumLocked ? (
              <View style={styles.lockedBanner}>
                <Text style={styles.lockedBannerText}>
                  This is a Premium plugin. Upgrade to Pro to use premium widgets.
                </Text>
              </View>
            ) : plugin.isInstalled ? (
              <View style={styles.installedActions}>
                <View style={styles.toggleRow}>
                  <Text style={styles.toggleLabel}>Plugin enabled</Text>
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
                    <Text style={styles.uninstallButtonLabel}>Uninstall Plugin</Text>
                  )}
                </Pressable>
              </View>
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
                  <Text style={styles.installButtonLabel}>Install Plugin</Text>
                )}
              </Pressable>
            )}
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#000",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: "#1e1e1e",
    alignItems: "flex-end",
  },
  closeButton: {
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  closeButtonLabel: {
    color: "#2d8cff",
    fontSize: 15,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    gap: 14,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  name: {
    color: "#fff",
    fontSize: 24,
    fontWeight: "700",
    flexShrink: 1,
  },
  category: {
    color: "#888",
    fontSize: 12,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  version: {
    color: "#555",
    fontSize: 12,
  },
  sectionLabel: {
    color: "#aaa",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
    marginTop: 8,
  },
  description: {
    color: "#ddd",
    fontSize: 14,
    lineHeight: 22,
  },
  changelog: {
    color: "#aaa",
    fontSize: 13,
    lineHeight: 20,
  },
  statusRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#2d2d2d",
  },
  statusLabel: {
    color: "#aaa",
    fontSize: 13,
    fontWeight: "600",
  },
  statusValue: {
    color: "#555",
    fontSize: 13,
  },
  statusInstalled: {
    color: "#4caf50",
  },
  lockedBanner: {
    backgroundColor: "#1a1400",
    borderRadius: 8,
    padding: 14,
    borderWidth: 1,
    borderColor: "#f5a62333",
    marginTop: 8,
  },
  lockedBannerText: {
    color: "#f5a623",
    fontSize: 13,
    lineHeight: 20,
  },
  installedActions: {
    gap: 12,
    marginTop: 8,
  },
  toggleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#111",
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 14,
    borderWidth: 1,
    borderColor: "#2d2d2d",
  },
  toggleLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  installButton: {
    backgroundColor: "#2d8cff",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  installButtonLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  uninstallButton: {
    borderWidth: 1,
    borderColor: "#662222",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
  },
  uninstallButtonLabel: {
    color: "#ff6b6b",
    fontSize: 15,
    fontWeight: "700",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
});
