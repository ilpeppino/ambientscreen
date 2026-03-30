import React from "react";
import type {
  WidgetRenderContext,
  WidgetClientPluginModule,
  WidgetConfigByKey,
  WidgetDataByKey,
  WidgetDataMeta,
  WidgetKey,
  WidgetPluginManifest,
} from "@ambient/shared-contracts";

const pluginsByKey = new Map<WidgetKey, WidgetClientPluginModule<WidgetKey, React.ReactNode>>();

export function registerWidgetPlugin<TKey extends WidgetKey>(plugin: WidgetClientPluginModule<TKey, React.ReactNode>) {
  if (pluginsByKey.has(plugin.manifest.key)) {
    throw new Error(`Duplicate widget plugin key: ${plugin.manifest.key}`);
  }

  pluginsByKey.set(plugin.manifest.key, plugin as unknown as WidgetClientPluginModule<WidgetKey, React.ReactNode>);
}

export function getWidgetPlugin(widgetKey: WidgetKey): WidgetClientPluginModule<WidgetKey, React.ReactNode> | null {
  return pluginsByKey.get(widgetKey) ?? null;
}

export function listWidgetPlugins(): WidgetClientPluginModule<WidgetKey, React.ReactNode>[] {
  return Array.from(pluginsByKey.values());
}

export function listWidgetPluginManifests(): WidgetPluginManifest<WidgetKey>[] {
  return listWidgetPlugins().map((plugin) => plugin.manifest);
}

export function getWidgetRefreshIntervalMs(widgetKey: WidgetKey | null | undefined): number | null {
  if (!widgetKey) {
    return null;
  }

  return getWidgetPlugin(widgetKey)?.manifest.refreshPolicy.intervalMs ?? null;
}

export function getWidgetConfigSchema(widgetKey: WidgetKey) {
  return getWidgetPlugin(widgetKey)?.configSchema ?? null;
}

export function getWidgetDefaultConfig(widgetKey: WidgetKey) {
  return getWidgetPlugin(widgetKey)?.defaultConfig ?? null;
}

export function getWidgetSettingsForm(widgetKey: WidgetKey) {
  return getWidgetPlugin(widgetKey)?.client.SettingsForm;
}

export function getWidgetPreview(widgetKey: WidgetKey) {
  return getWidgetPlugin(widgetKey)?.client.Preview;
}

export function renderWidgetFromKey(
  widgetKey: WidgetKey,
  input: {
    widgetInstanceId: string;
    state: "ready" | "stale" | "empty" | "error";
    data: WidgetDataByKey[WidgetKey] | null;
    config?: Record<string, unknown>;
    meta?: WidgetDataMeta;
    renderContext?: WidgetRenderContext;
  },
): React.ReactNode {
  const plugin = getWidgetPlugin(widgetKey);
  if (!plugin) {
    return null;
  }

  const safeConfig = {
    ...plugin.defaultConfig,
    ...(input.config ?? {}),
  } as WidgetConfigByKey[WidgetKey];

  return plugin.client.Renderer({
    widgetInstanceId: input.widgetInstanceId,
    widgetKey,
    state: input.state,
    data: input.data as WidgetDataByKey[WidgetKey] | null,
    config: safeConfig,
    meta: input.meta,
    renderContext: input.renderContext,
  });
}

export function resetWidgetPluginRegistryForTests() {
  pluginsByKey.clear();
}
