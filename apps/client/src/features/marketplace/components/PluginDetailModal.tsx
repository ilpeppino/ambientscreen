import React, { useEffect, useState } from "react";
import { Modal, ScrollView, StyleSheet, Switch, View } from "react-native";
import { Text } from "../../../shared/ui/components";
import {
  ActionRow,
  EmptyPanel,
  InlineStatusBadge,
  ManagementActionButton,
  SectionHeader,
} from "../../../shared/ui/management";
import { getRegistryPluginByKey, type RegistryPluginDetail } from "../../../services/api/pluginRegistryApi";
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

function statusBadges(plugin: MarketplacePlugin) {
  return (
    <View style={styles.badgesRow}>
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
    </View>
  );
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
          <ManagementActionButton label="Close" tone="passive" icon="close" onPress={onClose} />
        </View>

        {detailLoading ? (
          <EmptyPanel
            variant="loading"
            title="Loading details"
            message="Fetching plugin metadata and changelog."
          />
        ) : detailError ? (
          <EmptyPanel
            variant="error"
            title="Unable to load details"
            message={detailError}
          />
        ) : plugin ? (
          <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
            <SectionHeader
              icon={plugin.category === "weather" ? "weather" : plugin.category === "calendar" ? "calendar" : "grid"}
              title={plugin.name}
              subtitle={plugin.description}
            />

            {statusBadges(plugin)}

            <View style={styles.metaGrid}>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Category</Text>
                <Text style={styles.metaValue}>{plugin.category}</Text>
              </View>
              <View style={styles.metaRow}>
                <Text style={styles.metaLabel}>Version</Text>
                <Text style={styles.metaValue}>{plugin.activeVersion?.version ?? "N/A"}</Text>
              </View>
            </View>

            {detail?.activeVersion?.changelog ? (
              <View style={styles.sectionBlock}>
                <Text style={styles.sectionTitle}>Changelog</Text>
                <Text style={styles.sectionBody}>{detail.activeVersion.changelog}</Text>
              </View>
            ) : null}

            {isInstallationLocked || isPremiumLocked ? (
              <View style={styles.warningBlock}>
                <InlineStatusBadge label="Upgrade required" tone="warning" icon="lock" />
                <Text style={styles.warningBody}>
                  {isPremiumLocked
                    ? "This is a premium plugin and requires a Pro plan."
                    : "Plugin installation requires a Pro plan."}
                </Text>
              </View>
            ) : null}

            {plugin.isInstalled ? (
              <View style={styles.toggleRow}>
                <Text style={styles.metaLabel}>Plugin enabled</Text>
                <Switch
                  value={plugin.isEnabled}
                  onValueChange={onToggleEnabled}
                  disabled={actionInProgress}
                  trackColor={{ false: "#3d3d3d", true: "#2d8cff" }}
                  thumbColor={plugin.isEnabled ? "#fff" : "#888"}
                />
              </View>
            ) : null}

            <ActionRow>
              {!isInstallationLocked && !isPremiumLocked && !plugin.isInstalled ? (
                <ManagementActionButton
                  label="Install"
                  tone="primary"
                  icon="plus"
                  loading={actionInProgress}
                  onPress={onInstall}
                />
              ) : null}
              {plugin.isInstalled ? (
                <ManagementActionButton
                  label="Uninstall"
                  tone="destructive"
                  icon="trash"
                  loading={actionInProgress}
                  onPress={onUninstall}
                />
              ) : null}
              <ManagementActionButton label="Back" tone="passive" icon="chevronLeft" onPress={onClose} />
            </ActionRow>
          </ScrollView>
        ) : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#090c13",
    paddingTop: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  topBar: {
    alignItems: "flex-end",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: 12,
    paddingBottom: 24,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  metaGrid: {
    borderWidth: 1,
    borderColor: "#2a2d34",
    borderRadius: 12,
    backgroundColor: "#111317",
    padding: 12,
    gap: 8,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    color: "#9ca3af",
    fontSize: 13,
    fontWeight: "600",
  },
  metaValue: {
    color: "#e5e7eb",
    fontSize: 13,
  },
  sectionBlock: {
    borderWidth: 1,
    borderColor: "#2a2d34",
    borderRadius: 12,
    backgroundColor: "#111317",
    padding: 12,
    gap: 8,
  },
  sectionTitle: {
    color: "#ffffff",
    fontSize: 14,
    fontWeight: "700",
  },
  sectionBody: {
    color: "#a7a7a7",
    fontSize: 13,
    lineHeight: 20,
  },
  warningBlock: {
    borderWidth: 1,
    borderColor: "#6b5318",
    borderRadius: 12,
    backgroundColor: "#2d250f",
    padding: 12,
    gap: 8,
  },
  warningBody: {
    color: "#f5d27a",
    fontSize: 13,
    lineHeight: 18,
  },
  toggleRow: {
    borderWidth: 1,
    borderColor: "#2a2d34",
    borderRadius: 12,
    backgroundColor: "#111317",
    paddingHorizontal: 12,
    paddingVertical: 8,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
