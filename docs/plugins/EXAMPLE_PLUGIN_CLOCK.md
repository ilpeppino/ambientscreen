# Example Plugin: Clock & Date (`clockDate`)

This document walks through the complete `clockDate` widget plugin — the simplest built-in widget. It serves as the canonical reference for how plugins are structured and why each piece exists.

**Source files:**
- Shared definition: `packages/shared-contracts/src/widgets/plugin-sdk.ts`
- API plugin: `apps/api/src/modules/widgets/plugins/clockDate.plugin.ts`
- API resolver: `apps/api/src/modules/widgetData/resolvers/clockDate.resolver.ts`
- Client plugin: `apps/client/src/widgets/plugins/clockDate.plugin.tsx`
- Client renderer: `apps/client/src/widgets/clockDate/renderer.tsx`

---

## 1. Manifest

```typescript
// packages/shared-contracts/src/widgets/plugin-sdk.ts

manifest: {
  key: "clockDate",
  version: "1.0.0",
  name: "Clock & Date",
  description: "Displays the current time and date.",
  category: "time",
  defaultLayout: { w: 4, h: 2, minW: 2, minH: 1 },
  refreshPolicy: { intervalMs: 1000 },
}
```

**Why each field:**

- `key: "clockDate"` — The unique identifier used as the registry lookup key and stored in the database `WidgetInstance.type` column. It must match the TypeScript `WidgetKey` union.

- `version: "1.0.0"` — Plugin version for future compatibility tracking. Currently `"1.0.0"` for all built-ins.

- `name: "Clock & Date"` — Human-readable name displayed in the widget library UI.

- `description` — Short description for the widget library.

- `category: "time"` — Logical grouping for the widget library. The clockDate widget is categorized as a time-related widget.

- `defaultLayout: { w: 4, h: 2, minW: 2, minH: 1 }` — Default grid dimensions when a user places this widget on their display. The clock needs a reasonably wide and tall space to display legibly at large font sizes.

- `refreshPolicy: { intervalMs: 1000 }` — The client polls for fresh data every 1 second. This is appropriate for a clock because the time changes every second. A weather widget, by contrast, refreshes every 5 minutes.

---

## 2. Config Schema

```typescript
// packages/shared-contracts/src/widgets/plugin-sdk.ts

configSchema: {
  format: ["12h", "24h"],
  showSeconds: "boolean",
  timezone: "string",
}
```

**Why this schema:**

- `format: ["12h", "24h"]` — An enum field. The API converts this to a Zod `z.enum(["12h", "24h"])` validator. Only these two string values are valid — this prevents arbitrary strings from reaching the resolver.

- `showSeconds: "boolean"` — A boolean field. Controls whether seconds are included in the displayed time. Stored as a JSON boolean in the database.

- `timezone: "string"` — A free-form string field. Accepts any IANA timezone identifier (e.g. `"Europe/Amsterdam"`, `"America/New_York"`) or the special value `"local"` to use the server's local timezone. It's a string rather than an enum because the set of valid timezones is large and changes over time.

---

## 3. Default Config

```typescript
// packages/shared-contracts/src/widgets/plugin-sdk.ts

defaultConfig: {
  format: "24h",
  showSeconds: false,
  timezone: "local",
}
```

**Why these defaults:**

- `format: "24h"` — 24-hour format is the international standard and works without AM/PM labels, making it easier to read at a glance on an ambient display.

- `showSeconds: false` — Showing seconds requires a 1-second refresh. While the widget already refreshes every second, omitting seconds keeps the display cleaner and reduces rendering work.

- `timezone: "local"` — Defaults to the server's local timezone. Users deploying to a server in their own timezone get the correct time without configuration.

---

## 4. API Plugin Module

```typescript
// apps/api/src/modules/widgets/plugins/clockDate.plugin.ts

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
```

**Why it's structured this way:**

- `definition = widgetBuiltinDefinitions.clockDate` — The manifest, configSchema, and defaultConfig come from the shared package. This ensures the API and client always use the same definitions.

- `api.resolveData` — A thin wrapper that delegates to the resolver. The plugin module itself contains no business logic — it just connects the registry to the resolver.

- `WidgetApiPluginModule<"clockDate">` — The generic parameter makes TypeScript enforce that `api.resolveData` returns `Promise<WidgetDataEnvelope<ClockDateWidgetData, "clockDate">>`. This catches mismatches at compile time.

---

## 5. API Resolver

```typescript
// apps/api/src/modules/widgetData/resolvers/clockDate.resolver.ts

export async function resolveClockDateWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
}): Promise<WidgetDataEnvelope<ClockDateWidgetData, "clockDate">> {
  const now = new Date();
  const normalizedConfig = toClockDateConfig(input.widgetConfig);

  const hour12 = normalizedConfig.format === "12h";
  const timezone = normalizedConfig.timezone ?? "local";
  const locale = normalizedConfig.locale ?? "en-GB";

  const timeFormatter = createDateTimeFormat(locale, {
    hour: "2-digit",
    minute: "2-digit",
    hour12,
    ...(normalizedConfig.showSeconds ? { second: "2-digit" } : {}),
    ...(timezone === "local" ? {} : { timeZone: timezone }),
  });

  const dateFormatter = createDateTimeFormat(locale, {
    day: "2-digit",
    month: "long",
    year: "numeric",
    ...(timezone === "local" ? {} : { timeZone: timezone }),
  });

  const weekdayFormatter = createDateTimeFormat(locale, {
    weekday: "long",
    ...(timezone === "local" ? {} : { timeZone: timezone }),
  });

  return {
    widgetInstanceId: input.widgetInstanceId,
    widgetKey: "clockDate",
    state: "ready",
    data: {
      nowIso: now.toISOString(),
      formattedTime: timeFormatter.format(now),
      formattedDate: dateFormatter.format(now),
      weekdayLabel: weekdayFormatter.format(now),
    },
    meta: {
      fetchedAt: now.toISOString(),
      source: "system",
    },
  };
}
```

**Why the resolver works this way:**

- **`widgetConfig: unknown` input** — The resolver receives config as `unknown` because it performs its own normalization via `toClockDateConfig()`. The service layer has already run schema validation before calling the resolver, but the resolver normalizes defensively to handle type coercions.

- **`Intl.DateTimeFormat`** — The resolver uses the standard `Intl` API for locale-aware formatting. This means time formatting honors locale conventions (e.g. comma vs period as decimal separator) and timezone offsets without any third-party library.

- **`createDateTimeFormat` with fallback** — If an invalid timezone is passed, `Intl.DateTimeFormat` throws. The `createDateTimeFormat` helper catches this and retries without the `timeZone` option, falling back to local time.

- **`state: "ready"` always** — The clock resolver cannot fail in a meaningful way — system time is always available. It therefore always returns `"ready"`. Resolvers that call external APIs would use `"stale"` or `"error"` on failure.

- **`meta.source: "system"`** — Signals to the client that data came from the system clock (no external API involved).

- **Pre-formatted strings in `data`** — The resolver returns `formattedTime`, `formattedDate`, and `weekdayLabel` as pre-formatted strings rather than raw timestamps. The client is a thin rendering layer — it displays strings, it does not format them. This is a core design principle: the API owns business logic.

---

## 6. Resolver Config Normalization

```typescript
function toClockDateConfig(config: unknown): WidgetConfigByKey["clockDate"] {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  const format = raw.format === "12h" || raw.format === "24h"
    ? raw.format
    : "24h";

  return {
    format,
    showSeconds: typeof raw.showSeconds === "boolean" ? raw.showSeconds : false,
    timezone: typeof raw.timezone === "string" && raw.timezone.length > 0
      ? raw.timezone
      : "local",
  };
}
```

**Why defensive normalization:**

Even though the service validates config with Zod before calling the resolver, the resolver normalizes defensively because:

1. Legacy configs in the database may not conform to the current schema (migration is handled transparently)
2. The resolver may be called directly in tests with arbitrary input
3. TypeScript's type system is not a runtime guarantee — `unknown` means unknown

---

## 7. Client Plugin Module

```typescript
// apps/client/src/widgets/plugins/clockDate.plugin.tsx

import type { WidgetClientPluginModule } from "@ambient/shared-contracts";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { ClockDateRenderer } from "../clockDate/renderer";

const definition = widgetBuiltinDefinitions.clockDate;

export const clockDateWidgetPlugin: WidgetClientPluginModule<"clockDate", JSX.Element> = {
  manifest: definition.manifest,
  configSchema: definition.configSchema,
  defaultConfig: definition.defaultConfig,
  client: {
    Renderer: ({ data }) => <ClockDateRenderer data={data} />,
  },
};
```

**Why it mirrors the API plugin structure:**

The client plugin follows the same pattern as the API plugin — it imports the shared definition and delegates to the renderer. This makes plugins easy to reason about: the plugin module is thin configuration, the implementation is in the resolver or renderer.

The clockDate plugin has no `SettingsForm` because the initial implementation does not expose user-facing configuration editing.

---

## 8. Client Renderer

```typescript
// apps/client/src/widgets/clockDate/renderer.tsx

export function ClockDateRenderer({ data }: WidgetRendererProps<ClockDateWidgetData>) {
  if (!data) {
    return (
      <View style={styles.container}>
        <View style={styles.card}>
          <Text style={styles.loadingText}>No clock data available.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.card}>
        <Text style={styles.time}>{data.formattedTime}</Text>
        {data.weekdayLabel ? (
          <Text style={styles.weekday}>{data.weekdayLabel}</Text>
        ) : null}
        {data.formattedDate ? (
          <Text style={styles.date}>{data.formattedDate}</Text>
        ) : null}
      </View>
    </View>
  );
}
```

**Why the renderer is this simple:**

- **Null guard first** — The renderer always checks `if (!data)` before accessing data fields. This handles `state: "empty"` and `state: "error"` gracefully without crashing.

- **No formatting logic** — The renderer displays `data.formattedTime` directly. The API already formatted the time string — the renderer does not parse, transform, or format it.

- **Conditional rendering of optional fields** — `weekdayLabel` and `formattedDate` may be absent if the resolver returns them as empty strings. The null checks prevent empty `<Text>` elements from affecting layout.

- **StyleSheet with large typography** — The time is displayed at 108px font size. This is intentional for an ambient display meant to be read from across a room.

- **Dark theme** — All colors are hardcoded for the dark display background (`#fff`, `#efefef`, `#bfbfbf`). The ambient display always uses a dark background.

---

## Data Flow for clockDate (end to end)

```
1. DB: WidgetInstance { type: "clockDate", config: { format: "24h", showSeconds: false, timezone: "local" } }

2. Client: polls GET /widget-data/:id every 1000ms (from manifest.refreshPolicy.intervalMs)

3. API widgetDataService:
   a. Loads widget from DB
   b. Calls getWidgetPlugin("clockDate") → clockDateWidgetPlugin
   c. Validates config with Zod schema → success
   d. Normalizes config
   e. Calls plugin.api.resolveData({ widgetInstanceId, widgetConfig, widgetKey })

4. clockDate.resolver:
   a. Creates Intl.DateTimeFormat instances for time, date, weekday
   b. Returns: { state: "ready", data: { nowIso, formattedTime, formattedDate, weekdayLabel } }

5. API: returns WidgetDataEnvelope to client

6. Client: renderWidgetFromEnvelope(envelope)
   a. Looks up plugin by widgetKey
   b. Merges defaultConfig with stored config
   c. Calls plugin.client.Renderer with { state, data, config, meta }

7. ClockDateRenderer: displays formattedTime, weekdayLabel, formattedDate
```
