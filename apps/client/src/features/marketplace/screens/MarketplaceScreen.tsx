import React, { useMemo, useState } from "react";
import { SafeAreaView, StyleSheet, View, useWindowDimensions } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { Text } from "../../../shared/ui/components";
import {
  EmptyPanel,
  FilterChipItem,
  FilterChips,
  InlineStatusBadge,
  ManagementActionButton,
  SearchBar,
  SectionHeader,
} from "../../../shared/ui/management";
import { useEntitlements } from "../../entitlements/entitlements.context";
import { useMarketplace } from "../hooks/useMarketplace";
import {
  applyMarketplaceFilter,
  applyMarketplaceSearch,
  getMarketplaceCategories,
} from "../marketplace.logic";
import type { MarketplaceFilter, MarketplacePlugin } from "../marketplace.types";
import { PluginCard } from "../components/PluginCard";
import { PluginDetailModal } from "../components/PluginDetailModal";

interface MarketplaceScreenProps {
  onBack: () => void;
}

const FILTERS: FilterChipItem[] = [
  { label: "All", key: "all", icon: "grid" },
  { label: "Installed", key: "installed", icon: "check" },
  { label: "Not Installed", key: "not-installed", icon: "close" },
  { label: "Enabled", key: "enabled", icon: "check" },
  { label: "Disabled", key: "disabled", icon: "close" },
  { label: "Free", key: "free", icon: "grid" },
  { label: "Premium", key: "premium", icon: "star" },
];

function categoryIcon(category: string): FilterChipItem["icon"] {
  if (category === "weather") {
    return "weather";
  }

  if (category === "calendar") {
    return "calendar";
  }

  return "grid";
}

export function getMarketplaceColumnCount(width: number): number {
  if (width >= 1180) {
    return 3;
  }

  if (width >= 760) {
    return 2;
  }

  return 1;
}

export function MarketplaceScreen({ onBack }: MarketplaceScreenProps) {
  const { width } = useWindowDimensions();
  const { hasFeature } = useEntitlements();
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

  const [searchQuery, setSearchQuery] = useState("");
  const [activeFilter, setActiveFilter] = useState<MarketplaceFilter>("all");
  const [selectedPlugin, setSelectedPlugin] = useState<MarketplacePlugin | null>(null);

  const categories = useMemo(() => getMarketplaceCategories(plugins), [plugins]);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);

  const visiblePlugins = useMemo(() => {
    let result = plugins;

    if (selectedCategory) {
      result = result.filter((p) => p.category === selectedCategory);
    }

    result = applyMarketplaceFilter(result, activeFilter);
    result = applyMarketplaceSearch(result, searchQuery);

    return result;
  }, [plugins, selectedCategory, activeFilter, searchQuery]);

  const columns = getMarketplaceColumnCount(width);

  function isPremiumLocked(plugin: MarketplacePlugin): boolean {
    return plugin.isPremium && !hasFeature("premium_widgets");
  }

  function isInstallationLocked(): boolean {
    return !hasFeature("plugin_installation");
  }

  async function handleInstall(plugin: MarketplacePlugin) {
    await install(plugin.id);
    if (selectedPlugin?.id === plugin.id) {
      setSelectedPlugin((prev) =>
        prev ? { ...prev, isInstalled: true, isEnabled: true } : prev,
      );
    }
  }

  async function handleUninstall(plugin: MarketplacePlugin) {
    await uninstall(plugin.id);
    if (selectedPlugin?.id === plugin.id) {
      setSelectedPlugin((prev) =>
        prev ? { ...prev, isInstalled: false, isEnabled: false, installationId: null } : prev,
      );
    }
  }

  async function handleToggleEnabled(plugin: MarketplacePlugin, isEnabled: boolean) {
    await toggleEnabled(plugin.id, isEnabled);
    if (selectedPlugin?.id === plugin.id) {
      setSelectedPlugin((prev) => (prev ? { ...prev, isEnabled } : prev));
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <ManagementActionButton label="Back" icon="chevronLeft" tone="passive" onPress={onBack} />
      </View>

      <View style={styles.content}>
        <SectionHeader
          icon="star"
          title="Plugin Marketplace"
          subtitle="Browse, install, and manage plugins with clear status and actions."
          rightAction={
            <InlineStatusBadge
              label={`${visiblePlugins.length} result${visiblePlugins.length === 1 ? "" : "s"}`}
              tone="info"
              icon="grid"
            />
          }
        />

        <SearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search plugins by name, description, or category"
        />

        <FilterChips
          items={FILTERS}
          activeKey={activeFilter}
          onChange={(next) => setActiveFilter(next as MarketplaceFilter)}
        />

        {categories.length > 0 ? (
          <FilterChips
            items={categories.map((category) => ({
              key: category,
              label: category,
              icon: categoryIcon(category),
            }))}
            activeKey={selectedCategory}
            showAllOption="All categories"
            onChange={(next) => setSelectedCategory(next ? next : null)}
          />
        ) : null}

        {actionError ? (
          <View style={styles.actionErrorBanner}>
            <InlineStatusBadge label="Action failed" tone="danger" icon="close" />
            <Text style={styles.actionErrorText}>{actionError}</Text>
            <ManagementActionButton
              label="Dismiss"
              tone="passive"
              onPress={clearActionError}
            />
          </View>
        ) : null}

        {loading ? (
          <EmptyPanel
            variant="loading"
            title="Loading marketplace"
            message="Fetching available plugins and installation status."
          />
        ) : error ? (
          <EmptyPanel
            variant="error"
            title="Unable to load marketplace"
            message={error}
            actionLabel="Retry"
            onAction={refresh}
          />
        ) : visiblePlugins.length === 0 ? (
          <EmptyPanel
            title="No plugins found"
            message={
              plugins.length === 0
                ? "No plugins are currently published. Check back later."
                : "Try adjusting search or active filters."
            }
          />
        ) : (
          <FlashList
            data={visiblePlugins}
            numColumns={columns}
            key={columns}
            style={styles.list}
            contentContainerStyle={styles.listContent}
            keyExtractor={(plugin) => plugin.id}
            renderItem={({ item: plugin }) => {
              const locked = isPremiumLocked(plugin);
              const installLocked = isInstallationLocked();
              const busy = actionInProgress === plugin.id;

              return (
                <View style={styles.cardWrap}>
                  <PluginCard
                    plugin={plugin}
                    actionInProgress={busy}
                    isPremiumLocked={locked}
                    isInstallationLocked={installLocked}
                    onInstall={() => void handleInstall(plugin)}
                    onUninstall={() => void handleUninstall(plugin)}
                    onToggleEnabled={(enabled) => void handleToggleEnabled(plugin, enabled)}
                    onViewDetails={() => setSelectedPlugin(plugin)}
                  />
                </View>
              );
            }}
          />
        )}
      </View>

      {selectedPlugin ? (
        <PluginDetailModal
          plugin={
            plugins.find((p) => p.id === selectedPlugin.id) ?? selectedPlugin
          }
          actionInProgress={actionInProgress === selectedPlugin.id}
          isPremiumLocked={isPremiumLocked(selectedPlugin)}
          isInstallationLocked={isInstallationLocked()}
          onClose={() => setSelectedPlugin(null)}
          onInstall={() => void handleInstall(selectedPlugin)}
          onUninstall={() => void handleUninstall(selectedPlugin)}
          onToggleEnabled={(enabled) => void handleToggleEnabled(selectedPlugin, enabled)}
        />
      ) : null}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#090c13",
  },
  topBar: {
    paddingHorizontal: 20,
    paddingBottom: 6,
  },
  content: {
    flex: 1,
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  actionErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    borderWidth: 1,
    borderColor: "#5f2424",
    borderRadius: 12,
    backgroundColor: "#301414",
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  actionErrorText: {
    color: "#fecaca",
    fontSize: 13,
    flex: 1,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingBottom: 24,
  },
  cardWrap: {
    flex: 1,
    paddingHorizontal: 6,
    marginBottom: 12,
  },
});
