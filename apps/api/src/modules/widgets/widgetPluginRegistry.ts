import type {
  WidgetApiPluginModule,
  WidgetKey,
  WidgetPluginManifest,
} from "@ambient/shared-contracts";

const pluginsByKey = new Map<WidgetKey, WidgetApiPluginModule<WidgetKey>>();

export function registerWidgetPlugin<TKey extends WidgetKey>(
  plugin: WidgetApiPluginModule<TKey>,
) {
  const existing = pluginsByKey.get(plugin.manifest.key);
  if (existing) {
    throw new Error(`Duplicate widget plugin key: ${plugin.manifest.key}`);
  }

  pluginsByKey.set(plugin.manifest.key, plugin as unknown as WidgetApiPluginModule<WidgetKey>);
}

export function getWidgetPlugin(widgetKey: WidgetKey): WidgetApiPluginModule<WidgetKey> | null {
  return pluginsByKey.get(widgetKey) ?? null;
}

export function listWidgetPlugins(): WidgetApiPluginModule<WidgetKey>[] {
  return Array.from(pluginsByKey.values());
}

export function listWidgetPluginManifests(): WidgetPluginManifest<WidgetKey>[] {
  return listWidgetPlugins().map((plugin) => plugin.manifest);
}

export function getWidgetPluginConfigSchema(widgetKey: WidgetKey) {
  const plugin = getWidgetPlugin(widgetKey);
  return plugin?.configSchema ?? null;
}

export function getWidgetPluginDefaultConfig(widgetKey: WidgetKey) {
  const plugin = getWidgetPlugin(widgetKey);
  return plugin?.defaultConfig ?? null;
}

export function resetWidgetPluginRegistryForTests() {
  pluginsByKey.clear();
}
