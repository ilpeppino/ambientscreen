import React, { useEffect, useState } from "react";
import { ScrollView, StyleSheet, Switch, View } from "react-native";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import { Text } from "../../../shared/ui/components";
import {
  ActionRow,
  EmptyPanel,
  InlineStatusBadge,
  ManagementActionButton,
  SectionHeader,
} from "../../../shared/ui/management";
import { SheetModal, ConfirmDialog } from "../../../shared/ui/overlays";
import { getRegistryPluginByKey, type RegistryPluginDetail } from "../../../services/api/pluginRegistryApi";
import type { MarketplacePlugin } from "../marketplace.types";
import { InstallActionButton } from "./InstallActionButton";

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
  const [confirmUninstall, setConfirmUninstall] = useState(false);

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

  function handleUninstallRequest() {
    setConfirmUninstall(true);
  }

  function handleUninstallConfirm() {
    setConfirmUninstall(false);
    onUninstall();
  }

  function handleUninstallCancel() {
    setConfirmUninstall(false);
  }

  return (
    <>
      <SheetModal
        visible={plugin !== null}
        onRequestClose={onClose}
      >
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
                  trackColor={{ false: colors.border, true: colors.accentBlue }}
                  thumbColor={plugin.isEnabled ? colors.textPrimary : colors.textSecondary}
                />
              </View>
            ) : null}

            <ActionRow>
              <InstallActionButton
                isInstalled={plugin.isInstalled}
                isPremiumLocked={isPremiumLocked}
                isInstallationLocked={isInstallationLocked}
                loading={actionInProgress}
                onInstall={onInstall}
                onUninstall={handleUninstallRequest}
              />
              <ManagementActionButton label="Back" tone="passive" icon="chevronLeft" onPress={onClose} />
            </ActionRow>
          </ScrollView>
        ) : null}
      </SheetModal>

      <ConfirmDialog
        visible={confirmUninstall}
        title="Uninstall Plugin"
        message={`Are you sure you want to uninstall ${plugin?.name ?? "this plugin"}?`}
        warningText="Any widgets using this plugin will stop working."
        confirmLabel="Uninstall"
        loading={actionInProgress}
        onConfirm={handleUninstallConfirm}
        onCancel={handleUninstallCancel}
      />
    </>
  );
}

const styles = StyleSheet.create({
  scroll: {
    flex: 1,
  },
  scrollContent: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  badgesRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  metaGrid: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    gap: spacing.sm,
  },
  metaRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  metaLabel: {
    color: colors.textSecondary,
    fontSize: typography.small.fontSize,
    fontWeight: "600",
  },
  metaValue: {
    color: colors.textPrimary,
    fontSize: typography.small.fontSize,
  },
  sectionBlock: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceCard,
    padding: spacing.md,
    gap: spacing.sm,
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: typography.label.fontSize,
    fontWeight: "700",
  },
  sectionBody: {
    color: colors.textSecondary,
    fontSize: typography.small.fontSize,
    lineHeight: 20,
  },
  warningBlock: {
    borderWidth: 1,
    borderColor: colors.statusPremiumBorder,
    borderRadius: radius.md,
    backgroundColor: colors.statusPremiumBg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  warningBody: {
    color: colors.statusWarningText,
    fontSize: typography.small.fontSize,
    lineHeight: 18,
  },
  toggleRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceCard,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
});
