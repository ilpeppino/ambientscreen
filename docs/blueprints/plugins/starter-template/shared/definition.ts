// ============================================================
// STEP 2: Add your plugin's builtin definition
//
// Copy this entry into widgetBuiltinDefinitions in:
//   packages/shared-contracts/src/widgets/plugin-sdk.ts
// ============================================================

import type { WidgetBuiltinDefinition } from "@ambient/shared-contracts";

export const myWidgetDefinition: WidgetBuiltinDefinition<"myWidget"> = {
  manifest: {
    key: "myWidget",
    version: "1.0.0",
    name: "My Widget",
    description: "A short description of what this widget displays.",
    category: "custom",                          // e.g. "time", "environment", "productivity"
    defaultLayout: { w: 4, h: 2, minW: 2, minH: 1 },
    refreshPolicy: { intervalMs: 30000 },        // 30 seconds; use null for no auto-refresh
    // premium: true,                            // uncomment to gate behind premium tier
  },
  defaultConfig: {
    displayMode: "full",
    showLabel: true,
    title: "My Widget",
  },
  configSchema: {
    displayMode: ["compact", "full"],            // string enum
    showLabel: "boolean",                        // boolean field
    title: "string",                             // free text
  },
};
