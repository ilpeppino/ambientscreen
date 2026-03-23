// ============================================================
// STEP 3: API Resolver
//
// Copy to:
//   apps/api/src/modules/widgetData/resolvers/myWidget.resolver.ts
//
// The resolver fetches or computes data for your widget.
// It returns a WidgetDataEnvelope — never throws.
// ============================================================

import type {
  MyWidgetConfig,
  MyWidgetData,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";

// ---- Config normalization ----
// Even though the service validates config before calling the resolver,
// normalize defensively in case of legacy DB values or direct test calls.

function toMyWidgetConfig(config: unknown): MyWidgetConfig {
  const raw =
    config && typeof config === "object" && !Array.isArray(config)
      ? (config as Record<string, unknown>)
      : {};

  return {
    displayMode: raw.displayMode === "compact" ? "compact" : "full",
    showLabel: typeof raw.showLabel === "boolean" ? raw.showLabel : true,
    title: typeof raw.title === "string" && raw.title.length > 0 ? raw.title : "My Widget",
  };
}

// ---- Resolver ----

export async function resolveMyWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
}): Promise<WidgetDataEnvelope<MyWidgetData, "myWidget">> {
  const config = toMyWidgetConfig(input.widgetConfig);

  try {
    // TODO: Replace with your actual data-fetching logic.
    // Call an external API, read from a file, compute from system state, etc.
    const value = await fetchMyData(config);

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "myWidget",
      state: "ready",
      data: {
        value,
        fetchedAt: new Date().toISOString(),
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        source: "my-provider",              // identify your data source
      },
    };
  } catch (error) {
    // Resolver failures must be returned as error envelopes, not thrown.
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "myWidget",
      state: "error",
      data: null,
      meta: {
        errorCode: "PROVIDER_FAILURE",
        message: error instanceof Error ? error.message : "Unknown error",
      },
    };
  }
}

// ---- Provider ----
// Extract your actual data-fetching logic into a separate function
// (or a separate provider file under widgetData/providers/).

async function fetchMyData(config: MyWidgetConfig): Promise<string> {
  // TODO: implement
  return `${config.title}: example value (mode: ${config.displayMode})`;
}
