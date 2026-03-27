# Golden Widget Examples (Canonical)

**Status:** Source of truth
**Last updated:** 2026-03-27

---

## 1. Purpose

Three built-in widgets serve as the canonical reference implementations for all future widget development. When building a new widget, copy the relevant golden example and adapt it — do not start from scratch.

Each example demonstrates a distinct archetype:

| Widget | Archetype | Why it is the reference |
|--------|-----------|------------------------|
| `clockDate` | Simple widget | No external provider, no auth, pure system data |
| `weather` | Unauthenticated provider widget | External HTTP provider, no OAuth, normalized data envelope |
| `calendar` | Authenticated / integration-backed widget | OAuth connection, resource picker, integration platform, both iCal and Google paths |

---

## 2. Architecture rules all widgets must follow

Every widget — built-in or third-party — must satisfy these requirements before it can be considered complete:

### 2.1 Shared definition (manifest + schema + defaultConfig)

Must live in `packages/shared-contracts/src/widgets/plugin-sdk.ts` inside `widgetBuiltinDefinitions`.
This is the **single source of truth** — both the API plugin and the client plugin import from it.
Never duplicate manifest, configSchema, or defaultConfig between API and client.

### 2.2 API plugin module

File: `apps/api/src/modules/widgets/plugins/<widgetKey>.plugin.ts`
Must implement `WidgetApiPluginModule<TKey>` (from `@ambient/shared-contracts`).
Must have an `api.resolveData` function. Must be registered in `registerBuiltinPlugins.ts`.

### 2.3 Resolver

File: `apps/api/src/modules/widgetData/resolvers/<widgetKey>.resolver.ts`
Rules:
- Never throws — always returns a `WidgetDataEnvelope`
- Returns `state: "ready"` on success, `"empty"` for missing config, `"stale"` for provider errors, `"error"` for unrecoverable failures
- All config parsing via a `toXyzConfig(unknown)` guard — never trust raw DB values
- Accepts injectable provider functions for testability

### 2.4 Client plugin module

File: `apps/client/src/widgets/plugins/<widgetKey>.plugin.tsx`
Must implement `WidgetClientPluginModule<TKey, React.ReactElement>`.
Must have a `client.Renderer`. Must be registered in `registerBuiltinPlugins.ts`.
SettingsForm and Preview are optional but encouraged for provider widgets.

### 2.5 Client renderer

File: `apps/client/src/widgets/<widgetKey>/renderer.tsx`
Rules:
- Wraps content in `BaseWidgetFrame`
- Receives `WidgetRendererProps<TKey>` — never fetches data itself
- Does no business logic or data transformation; only presentation

### 2.6 Inspector definition

File: `apps/client/src/widgets/<widgetKey>/inspector.ts`
Every widget must export:
```ts
export function getInspectorDefinition(
  config: XyzConfig,
  context: XyzInspectorContext,
): InspectorDefinition
```
Rules:
- `displayValue` for every field — human-readable, never raw enum values or boolean strings
- No widget instance ID or layout fields
- Fields use `isVisible` / `isDisabled` for conditional display rather than being omitted
- `onChange` callbacks delegate entirely to `context.onChange`; no side-effects in the definition

---

## 3. Golden example: clockDate (simple widget)

### Why clockDate is the simple example

- All data is computed server-side from system time — no external HTTP calls
- No integration connections
- Config is 3 fields: `format`, `showSeconds`, `timezone`
- Resolver is ≈ 30 lines of pure logic
- Inspector definition is 2 sections, 3 fields, no conditional visibility needed

### File map

| Role | File |
|------|------|
| Shared definition | `packages/shared-contracts/src/widgets/plugin-sdk.ts` → `widgetBuiltinDefinitions.clockDate` |
| API plugin | `apps/api/src/modules/widgets/plugins/clockDate.plugin.ts` |
| Resolver | `apps/api/src/modules/widgetData/resolvers/clockDate.resolver.ts` |
| Client plugin | `apps/client/src/widgets/plugins/clockDate.plugin.tsx` |
| Renderer | `apps/client/src/widgets/clockDate/renderer.tsx` |
| Inspector definition | `apps/client/src/widgets/clockDate/inspector.ts` |
| Inspector tests | `apps/client/tests/clockDateInspector.test.ts` |

### Specific patterns to copy

**Config guard in the resolver** (`clockDate.resolver.ts`):
```ts
function toClockDateConfig(config: unknown): ClockDateWidgetConfig {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};
  return {
    format:      typeof raw.format === "string" ? raw.format as "12h" | "24h" : "24h",
    showSeconds: typeof raw.showSeconds === "boolean" ? raw.showSeconds : false,
    timezone:    typeof raw.timezone === "string" ? raw.timezone : "local",
  };
}
```

**Inspector section structure** (`clockDate/inspector.ts`):
```ts
export function getInspectorDefinition(
  config: ClockDateConfig,
  context: ClockDateInspectorContext,
): InspectorDefinition {
  return {
    sections: [
      { id: "time",   title: "Time",   fields: [...] },
      { id: "format", title: "Format", fields: [...] },
    ],
  };
}
```

---

## 4. Golden example: weather (unauthenticated provider widget)

### Why weather is the unauthenticated provider example

- Calls an external HTTP API (Open-Meteo) with no user credentials
- Provider is isolated in a dedicated adapter file
- Resolver accepts injectable `fetchWeatherData` for unit-testability without HTTP
- Inspector is 2 sections (location + display), no connections or OAuth
- Has SettingsForm and Preview components

### File map

| Role | File |
|------|------|
| Shared definition | `packages/shared-contracts/src/widgets/plugin-sdk.ts` → `widgetBuiltinDefinitions.weather` |
| API plugin | `apps/api/src/modules/widgets/plugins/weather.plugin.ts` |
| Provider adapter | `apps/api/src/modules/widgetData/providers/openweather.provider.ts` |
| Resolver | `apps/api/src/modules/widgetData/resolvers/weather.resolver.ts` |
| Client plugin | `apps/client/src/widgets/plugins/weather.plugin.tsx` |
| Renderer | `apps/client/src/widgets/weather/renderer.tsx` |
| Settings form | `apps/client/src/widgets/weather/settings-form.tsx` |
| Preview | `apps/client/src/widgets/weather/preview.tsx` |
| Inspector definition | `apps/client/src/widgets/weather/inspector.ts` |
| Inspector tests | `apps/client/tests/weatherInspector.test.ts` |

### Specific patterns to copy

**Provider isolation rule**: the resolver never imports the provider function directly at module scope when it can be injected:
```ts
export async function resolveWeatherData(
  input: WidgetApiResolverInput<"weather">,
  fetchWeatherData = defaultFetchWeatherData,  // injectable for tests
): Promise<WidgetDataEnvelope<WeatherWidgetData, "weather">>
```

**Normalized data shape — provider data never reaches the renderer directly**:
```ts
// Provider returns raw API response
// Resolver maps it to the shared contract type before returning
return {
  widgetInstanceId: input.widgetInstanceId,
  widgetKey: "weather",
  state: "ready",
  data: {
    location:       normalizedLocation,
    temperatureC:   normalizedTempC,
    conditionLabel: normalizedCondition,
    forecast:       normalizedForecast,
  },
  meta: { fetchedAt: new Date().toISOString(), source: "open-meteo" },
};
```

**Inspector with no connections** (`weather/inspector.ts`):
```ts
export interface WeatherInspectorContext {
  onChange: (patch: Partial<WeatherConfig>) => void;
}
// No onConnect, no connections array, no calendars — just onChange.
```

---

## 5. Golden example: calendar (authenticated / integration-backed widget)

### Why calendar is the authenticated integration example

- Supports both an unauthenticated iCal path and a Google Calendar OAuth path
- The Google path uses the integration platform: `IntegrationConnection`, token refresh, resource picker
- Inspector definition is the most complex: 3 sections, conditional field visibility, `connectionPicker`, `resourcePicker`, section-level refresh action
- All OAuth logic is outside the widget — the widget only stores `integrationConnectionId`
- No raw tokens or provider credentials appear in widget config or UI

### File map

| Role | File |
|------|------|
| Shared definition | `packages/shared-contracts/src/widgets/plugin-sdk.ts` → `widgetBuiltinDefinitions.calendar` |
| API plugin | `apps/api/src/modules/widgets/plugins/calendar.plugin.ts` |
| iCal provider | `apps/api/src/modules/widgetData/providers/ical.provider.ts` |
| Google Calendar provider | `apps/api/src/modules/widgetData/providers/googleCalendar.provider.ts` |
| Resolver | `apps/api/src/modules/widgetData/resolvers/calendar.resolver.ts` |
| Client plugin | `apps/client/src/widgets/plugins/calendar.plugin.tsx` |
| Renderer | `apps/client/src/widgets/calendar/renderer.tsx` |
| Settings form | `apps/client/src/widgets/calendar/settings-form.tsx` |
| Preview | `apps/client/src/widgets/calendar/preview.tsx` |
| Inspector definition | `apps/client/src/widgets/calendar/inspector.ts` |
| Inspector tests | `apps/client/tests/calendarInspector.test.ts` |

### Specific patterns to copy

**Connection + resource picker flow** (`calendar/inspector.ts`):
```ts
// Section 1: Connection — provider selector, icalUrl or connectionPicker
// Section 2: Calendar  — resourcePicker, disabled until connection exists
// Section 3: Display   — timeWindow, includeAllDay, maxEvents
```

**`isVisible` for conditional field display**:
```ts
{
  id: "icalUrl",
  kind: "text",
  isVisible: provider === "ical",   // hidden, not removed, when switching providers
  ...
},
{
  id: "connection",
  kind: "connectionPicker",
  isVisible: provider === "google",
  onConnect: context.onConnect,     // OAuth lives in the consumer, not here
  ...
},
```

**`isDisabled` for gating downstream fields**:
```ts
{
  id: "calendarId",
  kind: "resourcePicker",
  isDisabled: !hasConnection,       // user sees the field but can't use it yet
  ...
},
```

**Config naming note**: the internal `CalendarConfig` in `calendar/inspector.ts` uses `icalUrl` as the canonical field name, while the database-facing `CalendarWidgetConfig` in `shared-contracts` uses `account`. The consumer layer maps `icalUrl ↔ account` when reading or writing widget config. This is a deliberate naming split, documented at the top of `calendar/inspector.ts`.

---

## 6. Full golden-widget checklist

Use this checklist when evaluating any new widget:

### Contract completeness
- [ ] `widgetBuiltinDefinitions.<key>` exists in `plugin-sdk.ts` with `manifest`, `configSchema`, `defaultConfig`
- [ ] `manifest.key` matches the `WidgetKey` union in `shared-contracts/src/index.ts`
- [ ] `manifest.version`, `manifest.description`, `manifest.category` are populated
- [ ] `manifest.refreshPolicy.intervalMs` is intentional (null = push-only, number = polling interval)
- [ ] `manifest.defaultLayout` has sensible `w`, `h`, and optional `minW`, `minH`
- [ ] API plugin imports definition from `widgetBuiltinDefinitions` — no duplication
- [ ] Client plugin imports definition from `widgetBuiltinDefinitions` — no duplication

### Resolver
- [ ] Config parsed through a typed guard function (`toXyzConfig(unknown)`)
- [ ] Never throws — every code path returns a `WidgetDataEnvelope`
- [ ] Returns correct `state`: `ready` / `empty` / `stale` / `error`
- [ ] `meta.fetchedAt` set on every `ready` response
- [ ] `meta.source` set when data comes from an external provider
- [ ] Provider functions are injectable (not hard-imported) for unit testability

### Provider adapter (if applicable)
- [ ] Lives in `apps/api/src/modules/widgetData/providers/`
- [ ] Returns raw provider data — normalization is the resolver's job
- [ ] No auth tokens exposed beyond what the function needs
- [ ] Testable in isolation

### Renderer
- [ ] Uses `BaseWidgetFrame` wrapper
- [ ] Receives only `WidgetRendererProps<TKey>` — no direct data fetching
- [ ] No business logic or data transformation
- [ ] Handles `state: "empty"` and `state: "error"` gracefully

### Inspector definition
- [ ] File: `apps/client/src/widgets/<key>/inspector.ts`
- [ ] Exports `getInspectorDefinition(config, context): InspectorDefinition`
- [ ] Every field has a `displayValue` — human-readable, never a raw enum key or boolean string
- [ ] No field exposes `widgetInstanceId`, `widgetId`, or layout values
- [ ] Conditional fields use `isVisible`, not conditional array entries
- [ ] Gated fields use `isDisabled`
- [ ] `onChange` callbacks call `context.onChange` only — no side-effects in the definition
- [ ] `connectionPicker` fields expose `onConnect` but perform no OAuth themselves
- [ ] Tests exist in `apps/client/tests/<key>Inspector.test.ts`

### Registration
- [ ] API plugin registered in `apps/api/src/modules/widgets/registerBuiltinPlugins.ts`
- [ ] Client plugin registered in `apps/client/src/widgets/registerBuiltinPlugins.ts`

---

## 7. Known drift and notes

### clockDate — `format` vs `hour12`

`ClockDateWidgetConfig` in `shared-contracts` has both `format` ("12h"/"24h") and `hour12` (boolean).
The inspector exposes `hour12` only. `format` is set through the legacy SettingsForm path if used.
New integrations should prefer `hour12`.

### calendar — `icalUrl` vs `account`

`CalendarWidgetConfig.account` stores the iCal URL in the database.
`CalendarConfig.icalUrl` in `calendar/inspector.ts` uses the more descriptive name.
The consumer layer is responsible for mapping `icalUrl ↔ account` when reading/writing config.
See the file header in `apps/client/src/widgets/calendar/inspector.ts` for details.

### weather — SettingsForm retained alongside inspector

`WeatherSettingsForm` is the legacy settings UI (used in `weather.plugin.tsx` as `SettingsForm`).
`weather/inspector.ts` is the new declarative inspector definition (used by the inspector renderer).
Both coexist: the plugin module keeps `SettingsForm` for the edit modal flow; the inspector definition
is consumed by the read-only/edit inspector panel. This matches the same dual-path as calendar.

---

## 8. Related documents

- `docs/canonical/plugin-sdk.md` — full Plugin SDK contract
- `docs/canonical/inspector-components-api.md` — shared inspector system API
- `docs/canonical/integration-platform.md` — integration connection platform
- `docs/blueprints/plugins/CREATE_PLUGIN_GUIDE.md` — step-by-step new widget guide (non-canonical)
- `docs/blueprints/plugins/AUTHENTICATED_INTEGRATION_PLUGIN_PATTERN.md` — integration pattern detail
