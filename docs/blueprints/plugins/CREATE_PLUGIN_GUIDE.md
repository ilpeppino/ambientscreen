> Status: Non-canonical
> Type: Blueprint
> Authority: Not the primary source of truth when a canonical doc exists

# Create a Widget Plugin — Step-by-Step Guide

This guide walks through creating a new widget plugin for Ambient Screen from scratch. By the end you will have a working widget that appears in the widget library, fetches data server-side, and renders on the display.

**Prerequisites:** Familiarity with TypeScript and React Native. Read [PLUGIN_SDK.md](./PLUGIN_SDK.md) first.

---

## Overview of what you will create

| Artifact | Location |
|---|---|
| Shared definition (manifest, schema, defaults) | `packages/shared-contracts/src/widgets/plugin-sdk.ts` |
| API plugin module | `apps/api/src/modules/widgets/plugins/<key>.plugin.ts` |
| API resolver | `apps/api/src/modules/widgetData/resolvers/<key>.resolver.ts` |
| Client plugin module | `apps/client/src/widgets/plugins/<key>.plugin.tsx` |
| Client renderer component | `apps/client/src/widgets/<key>/renderer.tsx` |

---

## Step 1 — Define your widget key

Every plugin has a unique string key that identifies it across the system. This key is typed via `WidgetKey` in `@ambient/shared-contracts`.

Open `packages/shared-contracts/src/index.ts` and add your key to the `WidgetKey` union type and to the `WidgetConfigByKey` and `WidgetDataByKey` maps.

```typescript
// packages/shared-contracts/src/index.ts

export type WidgetKey = "clockDate" | "weather" | "calendar" | "myWidget";

export type WidgetConfigByKey = {
  clockDate: ClockDateWidgetConfig;
  weather: WeatherWidgetConfig;
  calendar: CalendarWidgetConfig;
  myWidget: MyWidgetConfig;      // ← add your config type
};

export type WidgetDataByKey = {
  clockDate: ClockDateWidgetData;
  weather: WeatherWidgetData;
  calendar: CalendarWidgetData;
  myWidget: MyWidgetData;        // ← add your data type
};
```

Define your config and data types:

```typescript
// Config: what the user can configure
export interface MyWidgetConfig {
  displayMode: "compact" | "full";
  showLabel: boolean;
}

// Data: what the API resolver returns
export interface MyWidgetData {
  value: string;
  updatedAt: string;
}
```

---

## Step 2 — Add the builtin definition

The builtin definition is the single source of truth for manifest, config schema, and default config. It is shared between the API and client — neither side needs to duplicate this.

Add your entry to `widgetBuiltinDefinitions` in `packages/shared-contracts/src/widgets/plugin-sdk.ts`:

```typescript
// packages/shared-contracts/src/widgets/plugin-sdk.ts

export const widgetBuiltinDefinitions = {
  // ... existing entries ...

  myWidget: {
    manifest: {
      key: "myWidget",
      version: "1.0.0",
      name: "My Widget",
      description: "Shows a custom value with a configurable display mode.",
      category: "custom",
      defaultLayout: { w: 4, h: 2, minW: 2, minH: 1 },
      refreshPolicy: { intervalMs: 30000 },  // refresh every 30 seconds
      // premium: true,  // uncomment if this widget requires a premium plan
    },
    defaultConfig: {
      displayMode: "full",
      showLabel: true,
    },
    configSchema: {
      displayMode: ["compact", "full"],  // enum — only these values allowed
      showLabel: "boolean",
    },
  },
};
```

**Manifest field guidance:**
- `key` — must match your `WidgetKey` exactly
- `version` — use `"1.0.0"` for a new plugin
- `refreshPolicy.intervalMs` — how often the client polls for data; use `null` if no polling is needed
- `defaultLayout` — choose sizes appropriate to your content; see existing widgets for reference
- `premium` — set to `true` if this widget is gated by the `premium_widgets` entitlement

---

## Step 3 — Implement the API resolver

The resolver fetches or computes your widget's data. It receives a validated, normalized config and returns a `WidgetDataEnvelope`.

Create `apps/api/src/modules/widgetData/resolvers/myWidget.resolver.ts`:

```typescript
import type { MyWidgetData, WidgetConfigByKey, WidgetDataEnvelope } from "@ambient/shared-contracts";

export async function resolveMyWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
}): Promise<WidgetDataEnvelope<MyWidgetData, "myWidget">> {
  const config = toMyWidgetConfig(input.widgetConfig);

  try {
    const value = await fetchMyData(config.displayMode);

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "myWidget",
      state: "ready",
      data: {
        value,
        updatedAt: new Date().toISOString(),
      },
      meta: {
        fetchedAt: new Date().toISOString(),
        source: "my-provider",
      },
    };
  } catch {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "myWidget",
      state: "error",
      data: null,
      meta: {
        errorCode: "PROVIDER_FAILURE",
        message: "Failed to fetch data from provider.",
      },
    };
  }
}

function toMyWidgetConfig(config: unknown): WidgetConfigByKey["myWidget"] {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  return {
    displayMode: raw.displayMode === "compact" ? "compact" : "full",
    showLabel: typeof raw.showLabel === "boolean" ? raw.showLabel : true,
  };
}

async function fetchMyData(mode: string): Promise<string> {
  // Replace with your actual data-fetching logic
  return `Hello from myWidget (mode: ${mode})`;
}
```

**Resolver contract:**
- Always return a `WidgetDataEnvelope` — never throw from the top-level function
- Use `state: "ready"` for valid data, `"stale"` for fallback data, `"empty"` when there is nothing to show, `"error"` for non-recoverable failures
- Normalize and validate config defensively — the `widgetConfig` input is `unknown`
- Set `meta.source` to a string identifying your data provider

---

## Step 4 — Create the API plugin module

The API plugin module wires together the manifest, config schema, defaults, and resolver.

Create `apps/api/src/modules/widgets/plugins/myWidget.plugin.ts`:

```typescript
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
```

---

## Step 5 — Implement the client renderer

The renderer is a React Native component. It receives the data envelope payload and renders the widget. Keep it purely presentational — no data fetching, no business logic.

All renderers must use `BaseWidgetFrame` as their outer wrapper. This ensures consistent surface styling, header rendering, and automatic state routing (error, empty, loading states). Do not build custom containers or hardcode theme values.

Create `apps/client/src/widgets/myWidget/renderer.tsx`:

```typescript
import React from "react";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import { colors, spacing } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";
import { StyleSheet, View } from "react-native";

export function MyWidgetRenderer({ state, data, config }: WidgetRendererProps<"myWidget">) {
  const hasData = Boolean(data?.value);

  return (
    <BaseWidgetFrame
      title="My Widget"
      icon="star"          // use an AppIconName from the allowed icon set
      state={state}
      hasData={hasData}
      emptyMessage="No data available."
      errorMessage="Something went wrong."
    >
      <View style={styles.content}>
        {config.showLabel && (
          <Text variant="caption" color="textSecondary" style={styles.label}>
            My Widget
          </Text>
        )}
        <Text variant="display" style={styles.value}>
          {data?.value}
        </Text>
      </View>
    </BaseWidgetFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  label: {
    marginBottom: spacing.sm,
    textTransform: "uppercase",
    letterSpacing: 2,
  },
  value: {
    fontSize: 48,
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
  },
});
```

**Renderer rules:**
- Always wrap in `BaseWidgetFrame` — pass `state`, `hasData`, and optional message props
- `BaseWidgetFrame` handles `data === null` automatically — do not guard `null` yourself in the outer return
- Use theme tokens from `src/shared/ui/theme` — do not hardcode colors or spacing
- Use `AppIcon` via `WidgetHeader` (inside `BaseWidgetFrame`) — do not import Lucide icons directly
- Do not make network calls or import API modules
- For the `icon` prop, only use names from the `AppIconName` type

See [PLUGIN_UI_GUIDELINES.md](./PLUGIN_UI_GUIDELINES.md) for detailed visual guidelines.

---

## Step 6 — Create the client plugin module

Create `apps/client/src/widgets/plugins/myWidget.plugin.tsx`:

```typescript
import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { MyWidgetRenderer } from "../myWidget/renderer";

const definition = widgetBuiltinDefinitions.myWidget;

export const myWidgetPlugin: WidgetClientPluginModule<"myWidget", JSX.Element> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: (props) => <MyWidgetRenderer {...props} />,
  },
};
```

---

## Step 7 — Add an optional settings form (optional)

If users should be able to configure your widget through a UI, add a `SettingsForm` to the client plugin:

```typescript
// apps/client/src/widgets/myWidget/settingsForm.tsx

import React from "react";
import { Switch, View } from "react-native";
import type { WidgetSettingsFormProps } from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import { spacing } from "../../shared/ui/theme";

export function MyWidgetSettingsForm({ config, onChange, disabled }: WidgetSettingsFormProps<"myWidget">) {
  return (
    <View style={{ gap: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between" }}>
        <Text variant="body" color="textPrimary">Show label</Text>
        <Switch
          value={config.showLabel}
          onValueChange={(v) => onChange({ ...config, showLabel: v })}
          disabled={disabled}
        />
      </View>
    </View>
  );
}
```

Then include it in the client plugin module:

```typescript
client: {
  Renderer: (props) => <MyWidgetRenderer {...props} />,
  SettingsForm: (props) => <MyWidgetSettingsForm {...props} />,
},
```

---

## Step 8 — Declare premium capability (if applicable)

If your widget should only be available on a paid plan:

1. Set `premium: true` in the manifest (Step 2)
2. The platform enforces the entitlement check automatically — no code needed in the renderer or resolver
3. The widget will appear in the marketplace with a premium badge
4. Users without the `premium_widgets` entitlement will see a locked state

Do not implement custom locking logic in your renderer. The widget container layer handles this.

---

## Step 9 — Authenticated integration config (if applicable)

If your widget fetches data from a third-party authenticated system (e.g. Google Calendar, CRM, analytics):

1. Add `integrationConnectionId` and `provider` fields to your config type and schema
2. The resolver loads the connection, validates ownership, refreshes tokens, and fetches data via the provider adapter
3. The client never calls the third-party API directly

```typescript
// Example config type for an authenticated plugin
export interface MyCrmWidgetConfig {
  provider: "my-crm";
  integrationConnectionId: string;
  resourceId: string;
}
```

Full specification: [AUTHENTICATED_INTEGRATION_PLUGIN_PATTERN.md](./AUTHENTICATED_INTEGRATION_PLUGIN_PATTERN.md)

---

## Step 10 — Register the plugin

### API registry

Open `apps/api/src/modules/widgets/registerBuiltinPlugins.ts` and add your plugin:

```typescript
import { myWidgetPlugin } from "./plugins/myWidget.plugin";

export function registerBuiltinWidgetPlugins() {
  if (registered) return;

  registerWidgetPlugin(clockDateWidgetPlugin);
  registerWidgetPlugin(weatherWidgetPlugin);
  registerWidgetPlugin(calendarWidgetPlugin);
  registerWidgetPlugin(myWidgetPlugin);   // ← add here

  registered = true;
}
```

### Client registry

Open `apps/client/src/widgets/registerBuiltinPlugins.ts` and add your plugin:

```typescript
import { myWidgetPlugin } from "./plugins/myWidget.plugin";

export function registerBuiltinWidgetPlugins() {
  if (registered) return;

  registerWidgetPlugin(clockDateWidgetPlugin);
  registerWidgetPlugin(weatherWidgetPlugin);
  registerWidgetPlugin(calendarWidgetPlugin);
  registerWidgetPlugin(myWidgetPlugin);   // ← add here

  registered = true;
}
```

---

## Step 11 — Test your plugin

### Unit test — API resolver

Add a test in `apps/api/tests/`:

```typescript
import { describe, it, expect } from "vitest";
import { resolveMyWidgetData } from "../src/modules/widgetData/resolvers/myWidget.resolver";

describe("myWidget resolver", () => {
  it("returns ready state with data", async () => {
    const result = await resolveMyWidgetData({
      widgetInstanceId: "test-id",
      widgetConfig: { displayMode: "full", showLabel: true },
    });

    expect(result.state).toBe("ready");
    expect(result.widgetKey).toBe("myWidget");
    expect(result.data).not.toBeNull();
    expect(result.data?.value).toBeDefined();
  });
});
```

### Unit test — client plugin registry

Add a test in `apps/client/tests/`:

```typescript
import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { registerWidgetPlugin, getWidgetPlugin, resetWidgetPluginRegistryForTests } from "../src/widgets/pluginRegistry";
import { myWidgetPlugin } from "../src/widgets/plugins/myWidget.plugin";

describe("myWidget plugin", () => {
  beforeEach(() => resetWidgetPluginRegistryForTests());
  afterEach(() => resetWidgetPluginRegistryForTests());

  it("registers and resolves", () => {
    registerWidgetPlugin(myWidgetPlugin);
    const plugin = getWidgetPlugin("myWidget");
    expect(plugin).not.toBeNull();
    expect(plugin?.manifest.key).toBe("myWidget");
  });
});
```

### Manual test — end to end

1. Start the API: `cd apps/api && npm run dev`
2. Create a widget instance via `POST /widgets` with `type: "myWidget"`
3. Fetch data via `GET /widget-data/:id`
4. Start the client: `cd apps/client && npm start`
5. The widget should appear on the display screen and render your data

---

## Checklist

- [ ] `WidgetKey` union includes your key
- [ ] `WidgetConfigByKey` and `WidgetDataByKey` include your types
- [ ] Builtin definition added to `widgetBuiltinDefinitions`
- [ ] Manifest declares `premium: true` if the widget requires a paid plan
- [ ] API resolver implemented and handles errors without throwing
- [ ] API plugin module created
- [ ] Client renderer uses `BaseWidgetFrame` — not raw containers or hardcoded colors
- [ ] Client renderer uses `AppIconName` icons only
- [ ] Client renderer passes `state`, `hasData`, `emptyMessage`, and `errorMessage` to `BaseWidgetFrame`
- [ ] Client plugin module created
- [ ] Plugin registered in both API and client `registerBuiltinWidgetPlugins()`
- [ ] Tests pass for resolver and registry
- [ ] `npm run typecheck` passes in `apps/api` and `apps/client`
