import { useCallback, useEffect, useState } from "react";
import {
  getInstalledPlugins,
  installPlugin,
  uninstallPlugin,
  setPluginEnabled,
  type InstalledPluginEntry,
} from "../../services/api/pluginInstallationApi";

interface InstalledPluginsState {
  installations: InstalledPluginEntry[];
  loading: boolean;
  error: string | null;
}

export function useInstalledPlugins() {
  const [state, setState] = useState<InstalledPluginsState>({
    installations: [],
    loading: true,
    error: null,
  });

  const refresh = useCallback(async () => {
    setState((prev) => ({ ...prev, loading: true, error: null }));
    try {
      const data = await getInstalledPlugins();
      setState({ installations: data, loading: false, error: null });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        loading: false,
        error: err instanceof Error ? err.message : "Failed to load plugins",
      }));
    }
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const install = useCallback(
    async (pluginId: string) => {
      await installPlugin(pluginId);
      await refresh();
    },
    [refresh],
  );

  const uninstall = useCallback(
    async (pluginId: string) => {
      await uninstallPlugin(pluginId);
      await refresh();
    },
    [refresh],
  );

  const toggleEnabled = useCallback(
    async (pluginId: string, isEnabled: boolean) => {
      await setPluginEnabled(pluginId, isEnabled);
      setState((prev) => ({
        ...prev,
        installations: prev.installations.map((i) =>
          i.pluginId === pluginId ? { ...i, isEnabled } : i,
        ),
      }));
    },
    [],
  );

  const isInstalled = useCallback(
    (pluginKey: string) =>
      state.installations.some((i) => i.plugin.key === pluginKey),
    [state.installations],
  );

  const isEnabled = useCallback(
    (pluginKey: string) =>
      state.installations.some((i) => i.plugin.key === pluginKey && i.isEnabled),
    [state.installations],
  );

  return {
    installations: state.installations,
    loading: state.loading,
    error: state.error,
    refresh,
    install,
    uninstall,
    toggleEnabled,
    isInstalled,
    isEnabled,
  };
}
