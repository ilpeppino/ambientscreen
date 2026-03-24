import type {
  WidgetConfigByKey,
  WidgetConfigFieldSchema,
  WidgetConfigSchema,
  WidgetKey,
} from "@ambient/shared-contracts";
import { registerBuiltinWidgetPlugins } from "./registerBuiltinPlugins";
import {
  getWidgetPlugin,
  listWidgetPlugins,
} from "./widgetPluginRegistry";

registerBuiltinWidgetPlugins();

export type SupportedWidgetType = WidgetKey;
export type SupportedWidgetConfig = WidgetConfigByKey[SupportedWidgetType];
export type SupportedWidgetConfigSchema = WidgetConfigSchema;
export type SupportedWidgetConfigFieldSchema = WidgetConfigFieldSchema;

export const SUPPORTED_WIDGET_TYPES = listWidgetPlugins().map((plugin) => plugin.manifest.key) as SupportedWidgetType[];

export const widgetRegistry = SUPPORTED_WIDGET_TYPES.reduce((accumulator, widgetType) => {
  const plugin = getWidgetPlugin(widgetType);
  if (!plugin) {
    return accumulator;
  }

  accumulator[widgetType] = {
    key: plugin.manifest.key,
    name: plugin.manifest.name,
    defaultConfig: plugin.defaultConfig,
    configSchema: plugin.configSchema,
  };

  return accumulator;
}, {} as Record<WidgetKey, {
  key: WidgetKey;
  name: string;
  defaultConfig: WidgetConfigByKey[WidgetKey];
  configSchema: WidgetConfigSchema;
}>);

export function getWidgetConfigSchema(widgetType: SupportedWidgetType): WidgetConfigSchema {
  const plugin = getWidgetPlugin(widgetType);
  if (!plugin) {
    throw new Error(`Widget plugin not registered: ${widgetType}`);
  }

  return plugin.configSchema;
}

export function getWidgetDefaultConfig(widgetType: SupportedWidgetType): WidgetConfigByKey[SupportedWidgetType] {
  const plugin = getWidgetPlugin(widgetType);
  if (!plugin) {
    throw new Error(`Widget plugin not registered: ${widgetType}`);
  }

  return plugin.defaultConfig;
}
