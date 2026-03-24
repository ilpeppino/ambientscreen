// ============================================================
// STEP 4: API Plugin Module
//
// Copy to:
//   apps/api/src/modules/widgets/plugins/myWidget.plugin.ts
//
// Wires manifest, schema, defaults, and resolver into one object
// that can be registered with the API plugin registry.
// ============================================================

import type { WidgetApiPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { resolveMyWidgetData } from "../../widgetData/resolvers/myWidget.resolver";

const definition = widgetBuiltinDefinitions.myWidget;

export const myWidgetPlugin: WidgetApiPluginModule<"myWidget"> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  api: {
    resolveData: async (input) => {
      return resolveMyWidgetData({
        widgetInstanceId: input.widgetInstanceId,
        widgetConfig: input.widgetConfig,
      });
    },
  },
};
