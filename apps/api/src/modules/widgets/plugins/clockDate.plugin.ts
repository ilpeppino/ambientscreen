import type { WidgetApiPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { resolveClockDateWidgetData } from "../../widgetData/resolvers/clockDate.resolver";

const definition = widgetBuiltinDefinitions.clockDate;

export const clockDateWidgetPlugin: WidgetApiPluginModule<"clockDate"> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  api: {
    resolveData: async (input) => {
      return resolveClockDateWidgetData({
        widgetInstanceId: input.widgetInstanceId,
        widgetConfig: input.widgetConfig,
      });
    },
  },
};
