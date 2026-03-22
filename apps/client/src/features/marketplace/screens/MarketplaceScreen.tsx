import React, { useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
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

const FILTERS: { label: string; value: MarketplaceFilter }[] = [
  { label: "All", value: "all" },
  { label: "Installed", value: "installed" },
  { label: "Not Installed", value: "not-installed" },
  { label: "Free", value: "free" },
  { label: "Premium", value: "premium" },
];

export function MarketplaceScreen({ onBack }: MarketplaceScreenProps) {
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

  function isPremiumLocked(plugin: MarketplacePlugin): boolean {
    return plugin.isPremium && !hasFeature("plugin_installation");
  }

  async function handleInstall(plugin: MarketplacePlugin) {
    await install(plugin.id);
    // Keep detail modal open but refreshed — plugin state updates via hook
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

  if (loading) {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonLabel}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Plugin Marketplace</Text>
        </View>
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.loadingText}>Loading marketplace...</Text>
        </View>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <View style={styles.topBar}>
          <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
            <Text style={styles.backButtonLabel}>Back</Text>
          </Pressable>
          <Text style={styles.title}>Plugin Marketplace</Text>
        </View>
        <View style={styles.centered}>
          <Text style={styles.errorText}>{error}</Text>
          <Pressable accessibilityRole="button" style={styles.retryButton} onPress={refresh}>
            <Text style={styles.retryButtonLabel}>Retry</Text>
          </Pressable>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.topBar}>
        <Pressable accessibilityRole="button" onPress={onBack} style={styles.backButton}>
          <Text style={styles.backButtonLabel}>Back</Text>
        </Pressable>
        <Text style={styles.title}>Plugin Marketplace</Text>
      </View>

      <View style={styles.searchRow}>
        <TextInput
          accessibilityLabel="Search plugins"
          style={styles.searchInput}
          value={searchQuery}
          onChangeText={setSearchQuery}
          placeholder="Search plugins..."
          placeholderTextColor="#555"
          autoCapitalize="none"
          autoCorrect={false}
        />
      </View>

      <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filterRow}>
        {FILTERS.map((f) => (
          <Pressable
            key={f.value}
            accessibilityRole="button"
            style={[styles.filterChip, activeFilter === f.value && styles.filterChipActive]}
            onPress={() => setActiveFilter(f.value)}
          >
            <Text
              style={[styles.filterChipLabel, activeFilter === f.value && styles.filterChipLabelActive]}
            >
              {f.label}
            </Text>
          </Pressable>
        ))}
      </ScrollView>

      {categories.length > 0 ? (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categoryRow}>
          <Pressable
            accessibilityRole="button"
            style={[styles.categoryChip, selectedCategory === null && styles.categoryChipActive]}
            onPress={() => setSelectedCategory(null)}
          >
            <Text
              style={[styles.categoryChipLabel, selectedCategory === null && styles.categoryChipLabelActive]}
            >
              All Categories
            </Text>
          </Pressable>
          {categories.map((cat) => (
            <Pressable
              key={cat}
              accessibilityRole="button"
              style={[styles.categoryChip, selectedCategory === cat && styles.categoryChipActive]}
              onPress={() => setSelectedCategory(selectedCategory === cat ? null : cat)}
            >
              <Text
                style={[
                  styles.categoryChipLabel,
                  selectedCategory === cat && styles.categoryChipLabelActive,
                ]}
              >
                {cat}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {actionError ? (
        <View style={styles.actionErrorBanner}>
          <Text style={styles.actionErrorText}>{actionError}</Text>
          <Pressable accessibilityRole="button" onPress={clearActionError} style={styles.dismissButton}>
            <Text style={styles.dismissButtonLabel}>Dismiss</Text>
          </Pressable>
        </View>
      ) : null}

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {visiblePlugins.length === 0 ? (
          <View style={styles.emptyState}>
            <Text style={styles.emptyTitle}>No plugins found</Text>
            <Text style={styles.emptySubtitle}>
              {plugins.length === 0
                ? "The marketplace is empty. Check back later."
                : "Try adjusting your search or filters."}
            </Text>
          </View>
        ) : (
          visiblePlugins.map((plugin) => {
            const locked = isPremiumLocked(plugin);
            const busy = actionInProgress === plugin.id;

            return (
              <PluginCard
                key={plugin.id}
                plugin={plugin}
                actionInProgress={busy}
                isPremiumLocked={locked}
                onInstall={() => void handleInstall(plugin)}
                onUninstall={() => void handleUninstall(plugin)}
                onToggleEnabled={(enabled) => void handleToggleEnabled(plugin, enabled)}
                onViewDetails={() => setSelectedPlugin(plugin)}
              />
            );
          })
        )}
      </ScrollView>

      {selectedPlugin ? (
        <PluginDetailModal
          plugin={
            // Keep detail modal in sync with latest plugin state from hook
            plugins.find((p) => p.id === selectedPlugin.id) ?? selectedPlugin
          }
          actionInProgress={actionInProgress === selectedPlugin.id}
          isPremiumLocked={isPremiumLocked(selectedPlugin)}
          onClose={() => setSelectedPlugin(null)}
          onInstall={() => void handleInstall(selectedPlugin)}
          onUninstall={() => void handleUninstall(selectedPlugin)}
          onToggleEnabled={(enabled) => void handleToggleEnabled(selectedPlugin, enabled)}
        />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 24,
  },
  topBar: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
    gap: 12,
  },
  backButton: {
    paddingVertical: 6,
    paddingHorizontal: 2,
  },
  backButtonLabel: {
    color: "#2d8cff",
    fontSize: 15,
    fontWeight: "600",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "700",
    flex: 1,
  },
  searchRow: {
    paddingHorizontal: 20,
    marginBottom: 10,
  },
  searchInput: {
    borderWidth: 1,
    borderColor: "#333",
    backgroundColor: "#111",
    borderRadius: 10,
    color: "#fff",
    paddingHorizontal: 14,
    paddingVertical: 10,
    fontSize: 14,
  },
  filterRow: {
    paddingHorizontal: 20,
    marginBottom: 8,
    flexGrow: 0,
  },
  filterChip: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 14,
    marginRight: 8,
    backgroundColor: "#111",
  },
  filterChipActive: {
    borderColor: "#2d8cff",
    backgroundColor: "#0d2a4a",
  },
  filterChipLabel: {
    color: "#888",
    fontSize: 13,
    fontWeight: "600",
  },
  filterChipLabelActive: {
    color: "#2d8cff",
  },
  categoryRow: {
    paddingHorizontal: 20,
    marginBottom: 8,
    flexGrow: 0,
  },
  categoryChip: {
    borderWidth: 1,
    borderColor: "#2d2d2d",
    borderRadius: 999,
    paddingVertical: 5,
    paddingHorizontal: 12,
    marginRight: 6,
    backgroundColor: "#0a0a0a",
  },
  categoryChipActive: {
    borderColor: "#555",
    backgroundColor: "#1a1a1a",
  },
  categoryChipLabel: {
    color: "#666",
    fontSize: 12,
    fontWeight: "600",
  },
  categoryChipLabelActive: {
    color: "#ddd",
  },
  actionErrorBanner: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#2a0a0a",
    borderWidth: 1,
    borderColor: "#662222",
    marginHorizontal: 20,
    marginBottom: 10,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 14,
    gap: 10,
  },
  actionErrorText: {
    flex: 1,
    color: "#ff6b6b",
    fontSize: 13,
  },
  dismissButton: {
    paddingHorizontal: 8,
  },
  dismissButtonLabel: {
    color: "#ff6b6b",
    fontSize: 12,
    fontWeight: "700",
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    gap: 12,
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 16,
  },
  loadingText: {
    color: "#888",
    fontSize: 14,
    marginTop: 8,
  },
  errorText: {
    color: "#ff6b6b",
    fontSize: 14,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  retryButton: {
    backgroundColor: "#1e1e1e",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderWidth: 1,
    borderColor: "#444",
  },
  retryButtonLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  emptyState: {
    alignItems: "center",
    paddingTop: 60,
    gap: 8,
  },
  emptyTitle: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  emptySubtitle: {
    color: "#666",
    fontSize: 13,
    textAlign: "center",
    paddingHorizontal: 20,
  },
});
