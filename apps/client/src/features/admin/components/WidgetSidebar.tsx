import React, { useMemo, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { FeatureFlagKey } from "@ambient/shared-contracts";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { EmptyPanel, InlineStatusBadge, ManagementActionButton } from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import { useMarketplace } from "../../marketplace/hooks/useMarketplace";
import type { MarketplacePlugin } from "../../marketplace/marketplace.types";
import type { CreatableWidgetType } from "../adminHome.logic";
import { WidgetLibraryPanel } from "./WidgetLibraryPanel";
import { WidgetPropertiesPanel } from "./WidgetPropertiesPanel";

type SidebarTab = "library" | "marketplace";

interface WidgetSidebarProps {
  plan: "free" | "pro";
  hasFeature: (key: FeatureFlagKey) => boolean;
  onUpgradePress: () => void;

  selectedLibraryWidgetType: CreatableWidgetType | null;
  onSelectLibraryWidget: (type: CreatableWidgetType) => void;

  inspectorMode: "canvas" | "library" | null;
  selectedWidget: DisplayLayoutWidgetEnvelope | null;
  onSaveConfig: (widgetId: string, config: Record<string, unknown>) => Promise<void>;

  /** Override the sidebar width. Defaults to the value in the stylesheet (288px). */
  width?: number;
}

function MarketplacePanel({
  hasFeature,
  onUpgradePress,
}: {
  hasFeature: (key: FeatureFlagKey) => boolean;
  onUpgradePress: () => void;
}) {
  const {
    plugins,
    loading,
    error,
    actionError,
    actionInProgress,
    refresh,
    install,
    uninstall,
    toggleEnabled,
    clearActionError,
  } = useMarketplace();

  const sortedPlugins = useMemo(
    () => [...plugins].sort((a, b) => a.name.localeCompare(b.name)),
    [plugins],
  );

  function isPremiumLocked(plugin: MarketplacePlugin): boolean {
    return plugin.isPremium && !hasFeature("premium_widgets");
  }

  function isInstallationLocked(): boolean {
    return !hasFeature("plugin_installation");
  }

  if (loading) {
    return (
      <EmptyPanel
        variant="loading"
        title="Loading marketplace"
        message="Fetching available plugins."
      />
    );
  }

  if (error) {
    return <ErrorState message={error} onRetry={() => void refresh()} />;
  }

  if (sortedPlugins.length === 0) {
    return (
      <EmptyPanel
        title="No plugins available"
        message="No marketplace plugins are currently published."
      />
    );
  }

  return (
    <View style={styles.marketplaceWrap}>
      {actionError ? (
        <View style={styles.marketplaceErrorBanner}>
          <Text style={styles.marketplaceErrorText}>{actionError}</Text>
          <ManagementActionButton label="Dismiss" tone="passive" onPress={clearActionError} />
        </View>
      ) : null}

      <ScrollView style={styles.marketplaceScroll} contentContainerStyle={styles.marketplaceContent}>
        {sortedPlugins.map((plugin) => {
          const premiumLocked = isPremiumLocked(plugin);
          const installationLocked = isInstallationLocked();
          const locked = premiumLocked || installationLocked;
          const busy = actionInProgress === plugin.id;

          return (
            <View key={plugin.id} style={styles.pluginRow}>
              <View style={styles.pluginHeader}>
                <Text style={styles.pluginName}>{plugin.name}</Text>
                <View style={styles.pluginBadges}>
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
                </View>
              </View>

              <Text style={styles.pluginDescription}>{plugin.description}</Text>

              <View style={styles.pluginActions}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={plugin.isInstalled ? `Uninstall ${plugin.name}` : `Install ${plugin.name}`}
                  style={[
                    styles.pluginActionButton,
                    plugin.isInstalled ? styles.uninstallButton : styles.installButton,
                    (locked || busy) ? styles.disabledButton : null,
                  ]}
                  onPress={() => {
                    if (locked || busy) {
                      if (premiumLocked || installationLocked) {
                        onUpgradePress();
                      }
                      return;
                    }
                    if (plugin.isInstalled) {
                      void uninstall(plugin.id);
                    } else {
                      void install(plugin.id);
                    }
                  }}
                  disabled={busy}
                >
                  <Text style={styles.pluginActionLabel}>
                    {busy ? "Working..." : plugin.isInstalled ? "Uninstall" : "Install"}
                  </Text>
                </Pressable>

                {plugin.isInstalled ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Toggle ${plugin.name} enabled`}
                    style={[styles.pluginActionButton, styles.toggleButton, busy ? styles.disabledButton : null]}
                    onPress={() => {
                      if (!busy) {
                        void toggleEnabled(plugin.id, !plugin.isEnabled);
                      }
                    }}
                    disabled={busy}
                  >
                    <Text style={styles.pluginActionLabel}>
                      {plugin.isEnabled ? "Disable" : "Enable"}
                    </Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
}

export function WidgetSidebar({
  plan,
  hasFeature,
  onUpgradePress,
  selectedLibraryWidgetType,
  onSelectLibraryWidget,
  inspectorMode,
  selectedWidget,
  onSaveConfig,
  width,
}: WidgetSidebarProps) {
  const [activeTab, setActiveTab] = useState<SidebarTab>("library");

  const canvasWidgetName = selectedWidget
    ? (widgetBuiltinDefinitions[selectedWidget.widgetKey]?.manifest.name ?? selectedWidget.widgetKey)
    : null;
  const libraryWidgetName = selectedLibraryWidgetType
    ? (widgetBuiltinDefinitions[selectedLibraryWidgetType]?.manifest.name ?? selectedLibraryWidgetType)
    : null;
  const panelSubtitle = inspectorMode === "canvas" && canvasWidgetName
    ? canvasWidgetName
    : inspectorMode === "library" && libraryWidgetName
      ? libraryWidgetName
      : null;

  return (
    <View style={[styles.sidebar, width !== undefined ? { width } : null]}>
      <View style={styles.section}>
        <View style={styles.panelHeader}>
          <View style={styles.panelHeading}>
            <Text style={styles.panelSectionLabel}>Library</Text>
          </View>
          {plan === "free" ? (
            <ManagementActionButton
              label="Upgrade"
              tone="passive"
              onPress={onUpgradePress}
            />
          ) : (
            <InlineStatusBadge label="Pro" tone="premium" icon="star" />
          )}
        </View>

        <View style={styles.tabWrap}>
          <View style={styles.tabBar}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sidebar tab library"
              style={[styles.tabButton, activeTab === "library" ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab("library")}
            >
              <Text style={[styles.tabLabel, activeTab === "library" ? styles.tabLabelActive : null]}>Library</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Sidebar tab marketplace"
              style={[styles.tabButton, activeTab === "marketplace" ? styles.tabButtonActive : null]}
              onPress={() => setActiveTab("marketplace")}
            >
              <Text style={[styles.tabLabel, activeTab === "marketplace" ? styles.tabLabelActive : null]}>Marketplace</Text>
            </Pressable>
          </View>
        </View>

        <View style={styles.libraryPanel}>
          {activeTab === "library" ? (
            <WidgetLibraryPanel
              selectedLibraryWidgetType={selectedLibraryWidgetType}
              hasFeature={hasFeature}
              onSelectLibraryWidget={onSelectLibraryWidget}
              onUpgradePress={onUpgradePress}
            />
          ) : (
            <MarketplacePanel hasFeature={hasFeature} onUpgradePress={onUpgradePress} />
          )}
        </View>
      </View>

      <View style={[styles.section, styles.sectionFill]}>
        <View style={styles.panelHeader}>
          <View style={styles.panelHeading}>
            <Text style={styles.panelSectionLabel}>Inspector</Text>
          </View>
          {panelSubtitle ? <Text style={styles.panelSubtitle}>{panelSubtitle}</Text> : null}
        </View>

        <View style={styles.propertiesPanel}>
          <WidgetPropertiesPanel
            key={selectedWidget?.widgetInstanceId ?? "none"}
            inspectorMode={inspectorMode}
            selectedLibraryWidgetType={selectedLibraryWidgetType}
            selectedWidget={selectedWidget}
            onSaveConfig={onSaveConfig}
          />
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 288,
    backgroundColor: colors.surfaceCard,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    flexDirection: "column",
    padding: spacing.sm,
    gap: spacing.sm,
  },
  section: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  sectionFill: {
    flex: 1,
    minHeight: 0,
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 44,
    gap: spacing.sm,
  },
  panelHeading: {
    flex: 1,
  },
  panelSectionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
    fontWeight: "700",
    opacity: 0.72,
  },
  panelSubtitle: {
    ...typography.caption,
    color: colors.textSecondary,
    maxWidth: 128,
    textAlign: "right",
    opacity: 0.78,
  },
  tabWrap: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabBar: {
    flexDirection: "row",
    gap: spacing.xs,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPassiveBg,
  },
  tabButton: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    minHeight: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: "transparent",
    backgroundColor: colors.buttonPassiveBg,
  },
  tabButtonActive: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  tabLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  tabLabelActive: {
    color: colors.statusInfoText,
  },
  libraryPanel: {
    height: 260,
    minHeight: 0,
  },
  propertiesPanel: {
    flex: 1,
    minHeight: 0,
  },
  marketplaceWrap: {
    flex: 1,
    minHeight: 0,
  },
  marketplaceScroll: {
    flex: 1,
  },
  marketplaceContent: {
    padding: spacing.md,
    gap: spacing.sm,
  },
  marketplaceErrorBanner: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.statusDangerBorder,
    backgroundColor: colors.statusDangerBg,
    gap: spacing.xs,
  },
  marketplaceErrorText: {
    ...typography.small,
    color: colors.statusDangerText,
  },
  pluginRow: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.backgroundPrimary,
    padding: spacing.sm,
    gap: spacing.xs,
  },
  pluginHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    gap: spacing.xs,
  },
  pluginName: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "700",
    flex: 1,
  },
  pluginBadges: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  pluginDescription: {
    ...typography.caption,
    color: colors.textSecondary,
    lineHeight: 16,
  },
  pluginActions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  pluginActionButton: {
    flex: 1,
    minHeight: 30,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: colors.buttonPassiveBg,
  },
  installButton: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  uninstallButton: {
    backgroundColor: colors.surfaceInput,
    borderColor: colors.borderInput,
  },
  toggleButton: {
    backgroundColor: colors.surfaceCard,
  },
  pluginActionLabel: {
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  disabledButton: {
    opacity: 0.5,
  },
});
