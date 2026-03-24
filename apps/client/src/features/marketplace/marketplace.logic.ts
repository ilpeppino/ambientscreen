import type { RegistryPlugin } from "../../services/api/pluginRegistryApi";
import type { InstalledPluginEntry } from "../../services/api/pluginInstallationApi";
import type { MarketplaceFilter, MarketplacePlugin } from "./marketplace.types";

/**
 * Merge registry plugins with the user's installed-plugin list into a unified
 * marketplace view. The registry is the source of truth for catalog entries;
 * the installations layer is the source of truth for user-specific state.
 */
export function buildMarketplacePlugins(
  registryPlugins: RegistryPlugin[],
  installations: InstalledPluginEntry[],
): MarketplacePlugin[] {
  return registryPlugins.map((rp) => {
    const installation = installations.find((i) => i.plugin.key === rp.key) ?? null;

    return {
      id: rp.id,
      key: rp.key,
      name: rp.name,
      description: rp.description,
      category: rp.category,
      isPremium: rp.isPremium,
      activeVersion: rp.activeVersion ? { version: rp.activeVersion.version } : null,
      isInstalled: installation !== null,
      isEnabled: installation?.isEnabled ?? false,
      installationId: installation?.id ?? null,
    };
  });
}

export function applyMarketplaceFilter(
  plugins: MarketplacePlugin[],
  filter: MarketplaceFilter,
): MarketplacePlugin[] {
  switch (filter) {
    case "installed":
      return plugins.filter((p) => p.isInstalled);
    case "not-installed":
      return plugins.filter((p) => !p.isInstalled);
    case "premium":
      return plugins.filter((p) => p.isPremium);
    case "free":
      return plugins.filter((p) => !p.isPremium);
    case "enabled":
      return plugins.filter((p) => p.isInstalled && p.isEnabled);
    case "disabled":
      return plugins.filter((p) => p.isInstalled && !p.isEnabled);
    default:
      return plugins;
  }
}

export function applyMarketplaceSearch(
  plugins: MarketplacePlugin[],
  query: string,
): MarketplacePlugin[] {
  const normalised = query.trim().toLowerCase();
  if (!normalised) {
    return plugins;
  }

  return plugins.filter(
    (p) =>
      p.name.toLowerCase().includes(normalised) ||
      p.description.toLowerCase().includes(normalised) ||
      p.category.toLowerCase().includes(normalised),
  );
}

export function getMarketplaceCategories(plugins: MarketplacePlugin[]): string[] {
  const seen = new Set<string>();
  for (const p of plugins) {
    seen.add(p.category);
  }
  return Array.from(seen).sort();
}
