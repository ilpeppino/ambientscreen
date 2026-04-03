import type { WidgetApiPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { resolveEmailFeedWidgetData } from "../../widgetData/resolvers/emailFeed.resolver";

const definition = widgetBuiltinDefinitions.emailFeed;

export const emailFeedWidgetPlugin: WidgetApiPluginModule<"emailFeed"> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  api: {
    resolveData: async (input) => {
      return resolveEmailFeedWidgetData({
        widgetInstanceId: input.widgetInstanceId,
        widgetConfig: input.widgetConfig,
        userId: input.userId,
      });
    },
  },
};
