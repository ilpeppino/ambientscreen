import { useCallback, useEffect, useRef, useState } from "react";
import { getRegistryPlugins, type RegistryPlugin } from "../../../services/api/pluginRegistryApi";
import {
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  setPluginEnabled,
  type InstalledPluginEntry,
} from "../../../services/api/pluginInstallationApi";
import { buildMarketplacePlugins } from "../marketplace.logic";
import type { MarketplacePlugin } from "../marketplace.types";

interface MarketplaceState {
  plugins: MarketplacePlugin[];
  loading: boolean;
  error: string | null;
  actionError: string | null;
  actionInProgress: string | null;
}

export function useMarketplace() {
  const [state, setState] = useState<MarketplaceState>({
    plugins: [],
    loading: true,
    error: null,
    actionError: null,
    actionInProgress: null,
  });

  // Keep a stable reference to the last-fetched registry list so we can
  // re-merge without re-fetching the full registry after install/uninstall.
  const registryRef = useRef<RegistryPlugin[]>([]);

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const [registryPlugins, installations] = await Promise.all([
        getRegistryPlugins(),
        getInstalledPlugins(),
      ]);
      registryRef.current = registryPlugins;
      const merged = buildMarketplacePlugins(registryPlugins, installations);
      setState({ plugins: merged, loading: false, error: null, actionError: null, actionInProgress: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load marketplace",
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const refreshInstallations = useCallback(async () => {
    const installations: InstalledPluginEntry[] = await getInstalledPlugins();
    const merged = buildMarketplacePlugins(registryRef.current, installations);
    setState((prev) => ({ ...prev, plugins: merged, actionInProgress: null }));
  }, []);

  const install = useCallback(
    async (pluginId: string) => {
      setState((prev) => ({ ...prev, actionInProgress: pluginId, actionError: null }));
      try {
        await installPlugin(pluginId);
        await refreshInstallations();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          actionInProgress: null,
          actionError: err instanceof Error ? err.message : "Failed to install plugin",
        }));
      }
    },
    [refreshInstallations],
  );

  const uninstall = useCallback(
    async (pluginId: string) => {
      setState((prev) => ({ ...prev, actionInProgress: pluginId, actionError: null }));
      try {
        await uninstallPlugin(pluginId);
        await refreshInstallations();
      } catch (err) {
        setState((prev) => ({
          ...prev,
          actionInProgress: null,
          actionError: err instanceof Error ? err.message : "Failed to uninstall plugin",
        }));
      }
    },
    [refreshInstallations],
  );

  const toggleEnabled = useCallback(
    async (pluginId: string, isEnabled: boolean) => {
      setState((prev) => ({ ...prev, actionInProgress: pluginId, actionError: null }));
      try {
        await setPluginEnabled(pluginId, isEnabled);
        // Optimistic update — no need to re-fetch installations
        setState((prev) => ({
          ...prev,
          plugins: prev.plugins.map((p) =>
            p.id === pluginId ? { ...p, isEnabled } : p,
          ),
          actionInProgress: null,
        }));
      } catch (err) {
        setState((prev) => ({
          ...prev,
          actionInProgress: null,
          actionError: err instanceof Error ? err.message : "Failed to update plugin",
        }));
      }
    },
    [],
  );

  const clearActionError = useCallback(() => {
    setState((prev) => ({ ...prev, actionError: null }));
  }, []);

  return {
    plugins: state.plugins,
    loading: state.loading,
    error: state.error,
    actionError: state.actionError,
    actionInProgress: state.actionInProgress,
    refresh,
    install,
    uninstall,
    toggleEnabled,
    clearActionError,
  };
}
