import type { WidgetApiPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { resolveRssNewsWidgetData } from "../../widgetData/resolvers/rssNews.resolver";

const definition = widgetBuiltinDefinitions.rssNews;

export const rssNewsWidgetPlugin: WidgetApiPluginModule<"rssNews"> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  api: {
    resolveData: async (input) => {
      return resolveRssNewsWidgetData({
        widgetInstanceId: input.widgetInstanceId,
        widgetConfig: input.widgetConfig,
      });
    },
  },
};
