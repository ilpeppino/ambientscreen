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

- No `premium` field — this widget is available on all plans.

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

- **`Intl.DateTimeFormat`** — The resolver uses the standard `Intl` API for locale-aware formatting. This means time formatting honors locale conventions and timezone offsets without any third-party library.

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
    Renderer: (props) => <ClockDateRenderer {...props} />,
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

import React from "react";
import { StyleSheet, View, useWindowDimensions } from "react-native";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import { colors, spacing } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";

export function ClockDateRenderer({ state, data }: WidgetRendererProps<"clockDate">) {
  const hasData = Boolean(data?.formattedTime);
  const { width } = useWindowDimensions();
  const scale = clamp(width / 1280, 0.5, 1);

  return (
    <BaseWidgetFrame
      title="Clock"
      icon="clock"
      state={state}
      hasData={hasData}
      emptyMessage="No clock data available."
      contentStyle={styles.content}
    >
      <Text
        style={[
          styles.time,
          {
            fontSize: Math.round(112 * scale),
            lineHeight: Math.round(118 * scale),
          },
        ]}
        adjustsFontSizeToFit
        numberOfLines={1}
        minimumFontScale={0.5}
      >
        {data?.formattedTime}
      </Text>
      <View style={styles.metaGroup}>
        {data?.weekdayLabel ? (
          <Text style={[styles.weekday, { fontSize: Math.round(28 * scale) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {data.weekdayLabel}
          </Text>
        ) : null}
        {data?.formattedDate ? (
          <Text style={[styles.date, { fontSize: Math.round(24 * scale), lineHeight: Math.round(30 * scale) }]} numberOfLines={1} adjustsFontSizeToFit minimumFontScale={0.6}>
            {data.formattedDate}
          </Text>
        ) : null}
      </View>
    </BaseWidgetFrame>
  );
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  time: {
    fontSize: 112,
    fontWeight: "700",
    color: colors.textPrimary,
    letterSpacing: 0.8,
    textAlign: "center",
    lineHeight: 118,
  },
  metaGroup: {
    marginTop: spacing.md,
    alignItems: "center",
    gap: spacing.xs,
  },
  weekday: {
    fontSize: 28,
    color: colors.textPrimary,
    letterSpacing: 1.5,
    textTransform: "uppercase",
    textAlign: "center",
  },
  date: {
    fontSize: 24,
    color: colors.textSecondary,
    lineHeight: 30,
    textAlign: "center",
  },
});
```

**Why the renderer is structured this way:**

- **`BaseWidgetFrame` as the outer wrapper** — All renderers use `BaseWidgetFrame` instead of composing `WidgetSurface`, `WidgetHeader`, and state handling manually. The frame receives `title`, `icon`, `state`, and `hasData` and handles surface styling, header rendering, and state routing automatically. Pass `emptyMessage` and `errorMessage` to customize fallback text.

- **`hasData = Boolean(data?.formattedTime)`** — Rather than checking `data === null`, the renderer checks whether the specific field it cares about is present. This is more precise and handles partially populated data gracefully.

- **No null guard in the outer return** — Because `BaseWidgetFrame` handles the empty/error states, the renderer does not need an explicit `if (!data) return ...` guard at the top level. The children are only rendered when `hasData` is true and `state` is `"ready"` or `"stale"`.

- **Responsive font scaling** — The time is displayed at up to 112px, scaled by the screen width relative to a 1280px reference. `clamp` keeps the scale between 0.5 and 1.0 so the widget reads well on both small and large screens.

- **Theme tokens, not hardcoded colors** — The renderer uses `colors.textPrimary` and `colors.textSecondary` from the theme system rather than raw hex strings. This ensures the widget adapts if the theme changes.

- **`adjustsFontSizeToFit` + `numberOfLines={1}`** — Prevents the time string from overflowing or wrapping at unusual screen widths.

- **Pre-formatted strings** — `data.formattedTime`, `data.weekdayLabel`, and `data.formattedDate` are displayed directly. The API resolver performs all formatting — the renderer does not parse or transform these values.

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

7. ClockDateRenderer:
   a. Wraps in BaseWidgetFrame (handles surface, header, state routing)
   b. Displays formattedTime, weekdayLabel, formattedDate with responsive font scaling
```
