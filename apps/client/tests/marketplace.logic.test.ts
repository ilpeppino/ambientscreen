import { test, expect, describe } from "vitest";
import {
  buildMarketplacePlugins,
  applyMarketplaceFilter,
  applyMarketplaceSearch,
  getMarketplaceCategories,
} from "../src/features/marketplace/marketplace.logic";
import type { RegistryPlugin } from "../src/services/api/pluginRegistryApi";
import type { InstalledPluginEntry } from "../src/services/api/pluginInstallationApi";

// ── fixtures ───────────────────────────────────────────────────────────────

const registryPlugins: RegistryPlugin[] = [
  {
    id: "plugin-1",
    key: "weather",
    name: "Weather Widget",
    description: "Displays current weather conditions",
    category: "weather",
    isPremium: false,
    activeVersion: { version: "1.0.0", isActive: true },
  },
  {
    id: "plugin-2",
    key: "calendar",
    name: "Calendar Widget",
    description: "Shows upcoming calendar events",
    category: "calendar",
    isPremium: false,
    activeVersion: { version: "1.2.0", isActive: true },
  },
  {
    id: "plugin-3",
    key: "news-pro",
    name: "News Pro",
    description: "Live news headlines — premium",
    category: "news",
    isPremium: true,
    activeVersion: { version: "2.0.0", isActive: true },
  },
];

const makeInstallation = (
  overrides: { key: string; pluginId: string; isEnabled?: boolean },
): InstalledPluginEntry => ({
  id: `install-${overrides.key}`,
  pluginId: overrides.pluginId,
  isEnabled: overrides.isEnabled ?? true,
  installedAt: "2026-03-01T00:00:00.000Z",
  plugin: {
    id: overrides.pluginId,
    key: overrides.key,
    name: "",
    description: "",
    category: "",
    isPremium: false,
    activeVersion: null,
  },
});

// ── buildMarketplacePlugins ────────────────────────────────────────────────

describe("buildMarketplacePlugins", () => {
  test("marks plugins without installations as not installed", () => {
    const result = buildMarketplacePlugins(registryPlugins, []);
    expect(result.every((p) => !p.isInstalled)).toBe(true);
    expect(result.every((p) => !p.isEnabled)).toBe(true);
    expect(result.every((p) => p.installationId === null)).toBe(true);
  });

  test("marks installed plugin as installed with correct installationId", () => {
    const installation = makeInstallation({ key: "weather", pluginId: "plugin-1" });
    const result = buildMarketplacePlugins(registryPlugins, [installation]);

    const weather = result.find((p) => p.key === "weather");
    expect(weather?.isInstalled).toBe(true);
    expect(weather?.isEnabled).toBe(true);
    expect(weather?.installationId).toBe("install-weather");
  });

  test("preserves disabled state from installation", () => {
    const installation = makeInstallation({
      key: "calendar",
      pluginId: "plugin-2",
      isEnabled: false,
    });
    const result = buildMarketplacePlugins(registryPlugins, [installation]);

    const calendar = result.find((p) => p.key === "calendar");
    expect(calendar?.isInstalled).toBe(true);
    expect(calendar?.isEnabled).toBe(false);
  });

  test("preserves registry metadata (name, description, category, version)", () => {
    const result = buildMarketplacePlugins(registryPlugins, []);
    const news = result.find((p) => p.key === "news-pro");

    expect(news?.name).toBe("News Pro");
    expect(news?.description).toBe("Live news headlines — premium");
    expect(news?.category).toBe("news");
    expect(news?.isPremium).toBe(true);
    expect(news?.activeVersion?.version).toBe("2.0.0");
  });

  test("returns same number of entries as registry plugins", () => {
    const result = buildMarketplacePlugins(registryPlugins, []);
    expect(result).toHaveLength(registryPlugins.length);
  });
});

// ── applyMarketplaceFilter ─────────────────────────────────────────────────

describe("applyMarketplaceFilter", () => {
  const installation = makeInstallation({ key: "weather", pluginId: "plugin-1" });
  const plugins = buildMarketplacePlugins(registryPlugins, [installation]);

  test("'all' returns every plugin", () => {
    expect(applyMarketplaceFilter(plugins, "all")).toHaveLength(plugins.length);
  });

  test("'installed' returns only installed plugins", () => {
    const result = applyMarketplaceFilter(plugins, "installed");
    expect(result.every((p) => p.isInstalled)).toBe(true);
    expect(result).toHaveLength(1);
  });

  test("'not-installed' returns only plugins that are not installed", () => {
    const result = applyMarketplaceFilter(plugins, "not-installed");
    expect(result.every((p) => !p.isInstalled)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test("'premium' returns only premium plugins", () => {
    const result = applyMarketplaceFilter(plugins, "premium");
    expect(result.every((p) => p.isPremium)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe("news-pro");
  });

  test("'free' returns only non-premium plugins", () => {
    const result = applyMarketplaceFilter(plugins, "free");
    expect(result.every((p) => !p.isPremium)).toBe(true);
    expect(result).toHaveLength(2);
  });

  test("'enabled' returns only installed and enabled plugins", () => {
    const result = applyMarketplaceFilter(plugins, "enabled");
    expect(result.every((p) => p.isInstalled && p.isEnabled)).toBe(true);
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe("weather");
  });

  test("'disabled' returns only installed and disabled plugins", () => {
    const disabledInstallation = makeInstallation({
      key: "calendar",
      pluginId: "plugin-2",
      isEnabled: false,
    });
    const mixedPlugins = buildMarketplacePlugins(registryPlugins, [
      makeInstallation({ key: "weather", pluginId: "plugin-1", isEnabled: true }),
      disabledInstallation,
    ]);
    const result = applyMarketplaceFilter(mixedPlugins, "disabled");
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe("calendar");
    expect(result[0]?.isEnabled).toBe(false);
  });
});

// ── applyMarketplaceSearch ─────────────────────────────────────────────────

describe("applyMarketplaceSearch", () => {
  const plugins = buildMarketplacePlugins(registryPlugins, []);

  test("empty query returns all plugins", () => {
    expect(applyMarketplaceSearch(plugins, "")).toHaveLength(plugins.length);
  });

  test("whitespace-only query returns all plugins", () => {
    expect(applyMarketplaceSearch(plugins, "   ")).toHaveLength(plugins.length);
  });

  test("matches plugin name (case-insensitive)", () => {
    const result = applyMarketplaceSearch(plugins, "weather");
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe("weather");
  });

  test("matches plugin description", () => {
    const result = applyMarketplaceSearch(plugins, "upcoming calendar");
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe("calendar");
  });

  test("matches plugin category", () => {
    const result = applyMarketplaceSearch(plugins, "news");
    expect(result).toHaveLength(1);
    expect(result[0]?.key).toBe("news-pro");
  });

  test("returns empty array when no match", () => {
    const result = applyMarketplaceSearch(plugins, "zzz-no-match");
    expect(result).toHaveLength(0);
  });
});

// ── getMarketplaceCategories ───────────────────────────────────────────────

describe("getMarketplaceCategories", () => {
  const plugins = buildMarketplacePlugins(registryPlugins, []);

  test("returns sorted unique categories", () => {
    const cats = getMarketplaceCategories(plugins);
    expect(cats).toEqual(["calendar", "news", "weather"]);
  });

  test("returns empty array for empty plugin list", () => {
    expect(getMarketplaceCategories([])).toEqual([]);
  });

  test("deduplicates categories", () => {
    const duplicated = [...plugins, { ...plugins[0]! }];
    const cats = getMarketplaceCategories(duplicated);
    const weatherCount = cats.filter((c) => c === "weather").length;
    expect(weatherCount).toBe(1);
  });
});
