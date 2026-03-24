import type {
  WidgetDataByKey,
  WidgetDataEnvelope,
  WidgetKey,
} from "@ambient/shared-contracts";
import { registerBuiltinWidgetPlugins } from "../widgets/registerBuiltinPlugins";
import { listWidgetPlugins } from "../widgets/widgetPluginRegistry";

registerBuiltinWidgetPlugins();

export type WidgetResolver<TKey extends WidgetKey> = (input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
  widgetKey: TKey;
}) => Promise<WidgetDataEnvelope<WidgetDataByKey[TKey], TKey>>;

export const widgetResolvers = listWidgetPlugins().reduce((accumulator, plugin) => {
  if (!plugin.api?.resolveData) {
    return accumulator;
  }

  accumulator[plugin.manifest.key] = plugin.api.resolveData as WidgetResolver<WidgetKey>;
  return accumulator;
}, {} as Partial<Record<WidgetKey, WidgetResolver<WidgetKey>>>);

export function getWidgetResolver(widgetKey: WidgetKey): WidgetResolver<WidgetKey> | null {
  const resolver = widgetResolvers[widgetKey];
  return resolver ?? null;
}
