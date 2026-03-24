import type { WidgetApiPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { resolveWeatherWidgetData } from "../../widgetData/resolvers/weather.resolver";

const definition = widgetBuiltinDefinitions.weather;

export const weatherWidgetPlugin: WidgetApiPluginModule<"weather"> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  api: {
    resolveData: async (input) => {
      return resolveWeatherWidgetData({
        widgetInstanceId: input.widgetInstanceId,
        widgetConfig: input.widgetConfig,
      });
    },
  },
};
