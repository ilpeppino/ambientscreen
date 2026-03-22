// ============================================================
// STEP 6: Client Plugin Module
//
// Copy to:
//   apps/client/src/widgets/plugins/myWidget.plugin.tsx
//
// Wires manifest, schema, defaults, renderer (and optional settings form)
// into one object for the client plugin registry.
// ============================================================

import React from "react";
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { MyWidgetRenderer } from "../myWidget/renderer";
// import { MyWidgetSettingsForm } from "../myWidget/settingsForm"; // uncomment if using settings

const definition = widgetBuiltinDefinitions.myWidget;

export const myWidgetPlugin: WidgetClientPluginModule<"myWidget", JSX.Element> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <MyWidgetRenderer {...props} />,
    // Uncomment to enable settings UI:
    // SettingsForm: (props) => <MyWidgetSettingsForm {...props} />,
  },
};
