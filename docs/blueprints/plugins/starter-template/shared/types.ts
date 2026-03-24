// ============================================================
// STEP 1: Add your plugin types to packages/shared-contracts
//
// Copy these additions into:
//   packages/shared-contracts/src/index.ts
// ============================================================

// 1a. Add your key to the WidgetKey union:
//
//   export type WidgetKey = "clockDate" | "weather" | "calendar" | "myWidget";
//
// 1b. Add your config type:

export interface MyWidgetConfig {
  // Example: an enum field
  displayMode: "compact" | "full";
  // Example: a boolean field
  showLabel: boolean;
  // Example: a free text field
  title: string;
}

// 1c. Add your data type (what the API resolver returns):

export interface MyWidgetData {
  // The resolved value to display
  value: string;
  // ISO timestamp of when the data was fetched
  fetchedAt: string;
}

// 1d. Add to WidgetConfigByKey and WidgetDataByKey maps:
//
//   export type WidgetConfigByKey = {
//     ...existing...
//     myWidget: MyWidgetConfig;
//   };
//
//   export type WidgetDataByKey = {
//     ...existing...
//     myWidget: MyWidgetData;
//   };
