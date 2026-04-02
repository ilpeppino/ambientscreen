import type { WidgetApiPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { resolveTasksWidgetData } from "../../widgetData/resolvers/tasks.resolver";

const definition = widgetBuiltinDefinitions.tasks;

export const tasksWidgetPlugin: WidgetApiPluginModule<"tasks"> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  api: {
    resolveData: async (input) => {
      return resolveTasksWidgetData({
        widgetInstanceId: input.widgetInstanceId,
        widgetConfig: input.widgetConfig,
        userId: input.userId,
      });
    },
  },
};
