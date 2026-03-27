import type { WidgetApiPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { resolveCalendarWidgetData } from "../../widgetData/resolvers/calendar.resolver";

const definition = widgetBuiltinDefinitions.calendar;

export const calendarWidgetPlugin: WidgetApiPluginModule<"calendar"> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  api: {
    resolveData: async (input) => {
      return resolveCalendarWidgetData({
        widgetInstanceId: input.widgetInstanceId,
        widgetConfig: input.widgetConfig,
        userId: input.userId,
      });
    },
  },
};
