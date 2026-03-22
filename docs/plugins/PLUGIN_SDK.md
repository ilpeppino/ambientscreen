# Widget Plugin SDK — Technical Reference

This document is the authoritative technical reference for the Ambient Screen widget plugin system (M4.5+).

---

## Overview

A **widget plugin** is a self-contained module that defines:

- **What the widget is** — manifest metadata (name, category, refresh rate, layout defaults)
- **What configuration it accepts** — config schema and defaults
- **How it fetches data** — an API-side resolver function
- **How it renders** — a client-side React Native renderer component
- **How users configure it** — an optional settings form component

Plugins integrate with both the API (data resolution) and the client (rendering) through a shared contract defined in `@ambient/shared-contracts`. The API and client each maintain their own plugin registry, both keyed by `WidgetKey`.

### Integration Points

```
┌───────────────────────────────────────────────────────┐
│  @ambient/shared-contracts                            │
│  ─ manifest, configSchema, defaultConfig types        │
│  ─ WidgetPluginModule interface                       │
│  ─ widgetBuiltinDefinitions (shared source of truth)  │
└───────────┬───────────────────────┬───────────────────┘
            │                       │
┌───────────▼──────────┐  ┌────────▼────────────────────┐
│  API Plugin           │  │  Client Plugin              │
│  ─ manifest           │  │  ─ manifest                 │
│  ─ configSchema       │  │  ─ configSchema             │
│  ─ defaultConfig      │  │  ─ defaultConfig            │
│  ─ api.resolveData()  │  │  ─ client.Renderer          │
└───────────┬──────────┘  │  ─ client.SettingsForm?      │
            │              │  ─ client.Preview?           │
     ┌──────▼──────┐       └─────────────────────────────┘
     │ API Registry │
     │ (Map by key) │
     └─────────────┘
```

---

## Plugin Anatomy

### Manifest

The manifest describes the plugin to the system. It is used by both the API and the client. The manifest is the identifier — plugins are looked up by `manifest.key`.

### Config Schema

A record defining the shape and type of the widget's configuration. Used by the API for validation before passing config to the resolver. Types are: `"string"`, `"boolean"`, `"number"`, or an array of string literals for enums.

### Default Config

The config value used when no user-provided config is available. Must conform to the config schema.

### API Resolver

A function that receives a widget instance ID and its config, fetches or computes the widget's data, and returns a standardized `WidgetDataEnvelope`. Lives only in the API process.

### Client Renderer

A React Native component that receives the data envelope payload and renders the widget. Lives only in the client process. It is purely presentational — no business logic. All renderers must use shared UI components from `src/widgets/shared/BaseWidgetFrame` and the theme system.

### Optional Settings Form

A React Native component for editing widget configuration. When provided, the client can display this in a settings UI. Optional.

### Optional Preview

A React Native component for rendering a static preview of the widget (e.g. in the marketplace or widget library). Optional.

---

## Manifest Specification

```typescript
interface WidgetPluginManifest<TKey extends WidgetKey = WidgetKey> {
  key: TKey;
  version: string;
  name: string;
  description: string;
  category: string;
  defaultLayout: WidgetDefaultLayout;
  refreshPolicy: WidgetPluginRefreshPolicy;
  premium?: boolean;
}

interface WidgetDefaultLayout {
  w: number;      // default width in grid units
  h: number;      // default height in grid units
  minW?: number;  // minimum width
  minH?: number;  // minimum height
}

interface WidgetPluginRefreshPolicy {
  intervalMs: number | null;  // null means no automatic refresh
}
```

### Field Reference

| Field | Type | Required | Description |
|---|---|---|---|
| `key` | `WidgetKey` | Yes | Unique identifier for this plugin. Used as lookup key in both registries. Must be a registered `WidgetKey`. |
| `version` | `string` | Yes | SemVer string for this plugin version. Currently `"1.0.0"` for all built-ins. |
| `name` | `string` | Yes | Human-readable display name shown in the widget library. |
| `description` | `string` | Yes | Short description of what this widget displays. |
| `category` | `string` | Yes | Logical grouping for the widget library (e.g. `"time"`, `"environment"`, `"productivity"`). |
| `defaultLayout.w` | `number` | Yes | Default grid width when the widget is placed on a display. |
| `defaultLayout.h` | `number` | Yes | Default grid height. |
| `defaultLayout.minW` | `number` | No | Minimum grid width the widget can be resized to. |
| `defaultLayout.minH` | `number` | No | Minimum grid height. |
| `refreshPolicy.intervalMs` | `number \| null` | Yes | How often the client should poll for fresh data, in milliseconds. Use `null` for widgets that do not need periodic refresh. |
| `premium` | `boolean` | No | If `true`, the widget is gated behind a premium tier. Defaults to `false`/`undefined`. |

---

## Config Schema Specification

```typescript
type WidgetConfigSchema = Record<string, WidgetConfigFieldSchema>;

type WidgetConfigFieldSchema =
  | "string"
  | "boolean"
  | "number"
  | readonly [string, ...string[]];   // string enum
```

### Field Type Semantics

| Type | Zod equivalent | Example |
|---|---|---|
| `"string"` | `z.string()` | `timezone: "string"` |
| `"boolean"` | `z.boolean()` | `showSeconds: "boolean"` |
| `"number"` | `z.number().int().min(1).max(20)` | `maxEvents: "number"` |
| `["a", "b"]` | `z.enum(["a", "b"])` | `format: ["12h", "24h"]` |

The API converts config schemas to Zod validators automatically. Configs failing validation return an `error` state envelope rather than reaching the resolver.

---

## Plugin Module Contract

### Full interface

```typescript
// packages/shared-contracts/src/widgets/plugin-sdk.ts

interface WidgetPluginModule<TKey extends WidgetKey = WidgetKey, TElement = unknown> {
  manifest: WidgetPluginManifest<TKey>;
  configSchema: WidgetConfigSchema;
  defaultConfig: WidgetConfigByKey[TKey];
  api?: {
    resolveData: WidgetApiResolveData<TKey>;
  };
  client?: {
    Renderer: WidgetClientRenderer<TKey, TElement>;
    SettingsForm?: WidgetClientSettingsForm<TKey, TElement>;
    Preview?: WidgetClientPreview<TKey, TElement>;
  };
}
```

### Narrowed types by platform

```typescript
// API plugins must have api.resolveData
type WidgetApiPluginModule<TKey extends WidgetKey = WidgetKey> =
  WidgetPluginModule<TKey> & {
    api: { resolveData: WidgetApiResolveData<TKey> };
  };

// Client plugins must have client.Renderer
type WidgetClientPluginModule<TKey extends WidgetKey = WidgetKey, TElement = unknown> =
  WidgetPluginModule<TKey, TElement> & {
    client: {
      Renderer: WidgetClientRenderer<TKey, TElement>;
      SettingsForm?: WidgetClientSettingsForm<TKey, TElement>;
      Preview?: WidgetClientPreview<TKey, TElement>;
    };
  };
```

### Resolver signature

```typescript
type WidgetApiResolveData<TKey extends WidgetKey = WidgetKey> = (
  input: WidgetApiResolverInput<TKey>
) => Promise<WidgetDataEnvelope<WidgetDataByKey[TKey], TKey>>;

interface WidgetApiResolverInput<TKey extends WidgetKey = WidgetKey> {
  widgetInstanceId: string;
  widgetConfig: unknown;  // validated and normalized before reaching resolver
  widgetKey: TKey;
}
```

### Renderer signature

```typescript
type WidgetClientRenderer<TKey extends WidgetKey = WidgetKey, TElement = unknown> = (
  props: WidgetRendererProps<TKey>
) => TElement;

interface WidgetRendererProps<TKey extends WidgetKey = WidgetKey> {
  widgetInstanceId: string;
  widgetKey: TKey;
  state: "ready" | "stale" | "empty" | "error";
  data: WidgetDataByKey[TKey] | null;
  config: WidgetConfigByKey[TKey];
  meta?: WidgetDataMeta;
}
```

### Settings form signature (optional)

```typescript
type WidgetClientSettingsForm<TKey extends WidgetKey = WidgetKey, TElement = unknown> = (
  props: WidgetSettingsFormProps<TKey>
) => TElement;

interface WidgetSettingsFormProps<TKey extends WidgetKey = WidgetKey> {
  widgetKey: TKey;
  schema: WidgetConfigSchema;
  config: WidgetConfigByKey[TKey];
  disabled?: boolean;
  onChange: (nextConfig: WidgetConfigByKey[TKey]) => void;
}
```

---

## Widget Data Envelope

All API resolvers return a `WidgetDataEnvelope`. The client receives this as-is and passes it to the renderer.

```typescript
interface WidgetDataEnvelope<TData, TKey extends WidgetKey> {
  widgetInstanceId: string;
  widgetKey: TKey;
  state: "ready" | "stale" | "empty" | "error";
  data: TData | null;
  meta?: WidgetDataMeta;
}

interface WidgetDataMeta {
  fetchedAt?: string;    // ISO timestamp
  staleAt?: string;      // ISO timestamp when data becomes stale
  source?: string;       // e.g. "system", "open-meteo", "ical"
  fromCache?: boolean;
  errorCode?: string;    // e.g. "UNSUPPORTED_WIDGET_TYPE", "INVALID_WIDGET_CONFIG"
  message?: string;
}
```

### State semantics

| State | Meaning | `data` |
|---|---|---|
| `"ready"` | Valid, fresh data available | Present |
| `"stale"` | Provider failed but fallback available | Present |
| `"empty"` | No data (widget not configured, no events) | `null` |
| `"error"` | Plugin or config error, non-recoverable | `null` |

Renderers must handle all four states. Use `BaseWidgetFrame` — it handles state routing automatically.

---

## Shared UI System

All widget renderers must integrate with the shared UI system. Do not write custom containers, hardcode colors, or manage state display manually.

### Core components

| Component | Source | Purpose |
|---|---|---|
| `BaseWidgetFrame` | `src/widgets/shared/BaseWidgetFrame` | Top-level renderer wrapper. Renders surface, header, and routes state to WidgetState automatically. |
| `WidgetSurface` | `src/shared/ui/widgets/WidgetSurface` | Styled container surface. Handles display/edit mode styling and selected state. |
| `WidgetHeader` | `src/shared/ui/widgets/WidgetHeader` | Icon + title row. Adapts to display/edit mode automatically. |
| `WidgetState` | `src/shared/ui/widgets/WidgetState` | Standardized loading/error/empty display. |
| `AppIcon` | `src/shared/ui/components/AppIcon` | Icon renderer. Enforces Lucide icons, size tokens, and color tokens. |
| `Text` | `src/shared/ui/components/Text` | Typography component with variant and color token support. |

### Theme tokens

All values (colors, spacing, radius, shadows, typography) are defined in `src/shared/ui/theme/`. Do not hardcode these values.

```typescript
import { colors, spacing, radius, shadows } from "../../shared/ui/theme";

// Colors
colors.backgroundPrimary  // "#000000"
colors.surface            // "#1C1C1C"
colors.textPrimary        // "#FFFFFF"
colors.textSecondary      // "#9A9A9A"
colors.error              // "#FF6B6B"
colors.accent             // "#F5A623"

// Spacing (xs=4, sm=8, md=12, lg=16, xl=24, xxl=32)
spacing.sm   // 8
spacing.md   // 12
spacing.xl   // 24

// Radius
radius.sm    // 8
radius.md    // 12
radius.lg    // 16–20
```

### AppIcon usage

`AppIcon` is the only way to render icons in the plugin system. Do not import Lucide icons directly.

```typescript
import { AppIcon } from "../../shared/ui/components/AppIcon";
import type { AppIconName } from "../../shared/ui/components/AppIcon";

// Size tokens: "sm" (16-20), "md" (24), "lg" (32), "xl" (48-64)
// Color tokens: "textPrimary", "textSecondary", "accent", "error"

<AppIcon name="clock" size="sm" color="textSecondary" />
```

Available icon names: `lock`, `star`, `settings`, `search`, `refresh`, `calendar`, `weather`, `clock`, `grid`, `chevronLeft`, `chevronRight`, `check`, `plus`, `close`, `trash`.

---

## Display Mode vs Edit Mode

The `mode` prop on `BaseWidgetFrame`, `WidgetSurface`, and `WidgetHeader` controls how the widget renders in different contexts.

### Display mode (default)

- Widget is being viewed on the ambient display
- Minimal chrome: subdued borders, dark background, low visual noise
- Header text is small (`caption` variant) with `textSecondary` color
- Optimized for readability at a distance

### Edit mode

- Widget is selected or being arranged on the dashboard
- Stronger borders, slightly lighter background
- Header text is more prominent (`body` variant) with `textPrimary` color
- Selection highlight uses `colors.accent` border

```typescript
// The renderer receives mode via the display context, not the data envelope.
// BaseWidgetFrame accepts mode and isSelected and forwards them to sub-components.
<BaseWidgetFrame
  title="My Widget"
  icon="clock"
  state={state}
  hasData={Boolean(data)}
  mode="display"     // "display" | "edit"
  isSelected={false}
>
  {/* content */}
</BaseWidgetFrame>
```

---

## Standardized Widget States

`BaseWidgetFrame` routes state automatically. Pass `state` and `hasData` and it renders the appropriate state UI instead of children.

| `state` | `hasData` | Rendered output |
|---|---|---|
| `"ready"` | `true` | `children` |
| `"stale"` | `true` | `children` (stale data is shown, not blocked) |
| `"empty"` | any | `WidgetState type="empty"` with optional `emptyMessage` |
| `"error"` | any | `WidgetState type="error"` with optional `errorMessage` |
| any | `false` | `WidgetState type="empty"` |

### Locked state (premium)

A widget marked `premium: true` in its manifest is gated by the `premium_widgets` entitlement. The client renders a locked overlay for users without the entitlement. This is handled by the widget container infrastructure, not the renderer itself.

Plugin renderers do not need to implement locked state — the platform wraps premium widgets automatically. However, the manifest must declare `premium: true` to trigger this gating.

---

## Premium Plugin Declaration

To mark a plugin as premium:

```typescript
// packages/shared-contracts/src/widgets/plugin-sdk.ts
manifest: {
  key: "myPremiumWidget",
  // ...
  premium: true,   // gates this widget behind the premium_widgets entitlement
},
```

Premium plugins that are not entitled by the user's plan render in a locked state via the widget container layer. The renderer and resolver are not invoked for locked widgets — the platform short-circuits before reaching plugin code.

The entitlement check uses `FeatureFlagKey: "premium_widgets"` from `@ambient/shared-contracts`.

---

## Integration-Backed Plugin Pattern

Some plugins require authenticated third-party connections (e.g. Google Calendar, CRM systems, business dashboards). These plugins must follow the integration connection pattern:

1. Widget config includes `provider` and `integrationConnectionId` fields
2. The API resolver loads the integration connection, validates ownership, refreshes tokens if needed, fetches provider data, and normalizes the result
3. The client only receives normalized widget data — it never talks to the third-party provider directly

Full specification: [AUTHENTICATED_INTEGRATION_PLUGIN_PATTERN.md](./AUTHENTICATED_INTEGRATION_PLUGIN_PATTERN.md)

---

## Marketplace / Plugin Lifecycle Overview

Plugins exist in two distinct registries:

**Runtime registry** — an in-memory `Map<WidgetKey, PluginModule>` in each process. Built-in plugins are always available. Marketplace plugins must be registered at runtime after installation.

**Marketplace metadata registry** — the database-backed `Plugin` and `PluginVersion` tables. These track approval status, versions, and install state independently of the in-memory runtime.

A plugin becomes available to users by moving through these states:

1. Author publishes plugin and version (status: `PENDING`)
2. Admin approves plugin and version (status: `APPROVED`, `isApproved: true`)
3. Approved plugin appears in marketplace (`GET /plugins`)
4. User installs plugin (`POST /me/plugins/:id`)
5. Installed plugin can be enabled or disabled (`PATCH /me/plugins/:id`)
6. Enabled installed plugin is usable in widget creation and runtime

See [MARKETPLACE_PLUGIN_LIFECYCLE.md](./MARKETPLACE_PLUGIN_LIFECYCLE.md) for the full lifecycle specification.

---

## Data Flow

1. **Widget instance stored in DB** — a `WidgetInstance` row exists with `type`, `config` (JSON), and `userId`.

2. **Client polls** — the client calls `GET /widget-data/:widgetInstanceId` at the interval specified in the plugin's `refreshPolicy.intervalMs`.

3. **API loads plugin** — `widgetDataService` calls `getWidgetPlugin(widget.type)`. If the plugin is not registered, returns an `error` envelope with `errorCode: "UNSUPPORTED_WIDGET_TYPE"`.

4. **API validates config** — `validateWidgetConfig()` runs the config through the plugin's Zod schema. Invalid config returns an `error` envelope with `errorCode: "INVALID_WIDGET_CONFIG"`.

5. **API normalizes config** — `normalizeWidgetConfig()` coerces types and maps legacy config keys to current schema.

6. **API resolves data** — `plugin.api.resolveData(input)` is called. The resolver fetches data from a provider (system clock, weather API, calendar feed) and returns a `WidgetDataEnvelope`.

7. **Client receives envelope** — the client passes the envelope to `renderWidgetFromEnvelope()`.

8. **Client renders** — the plugin's `Renderer` component receives `state`, `data`, `config`, and `meta` and renders the widget via `BaseWidgetFrame`.

---

## Lifecycle

### Registration

Built-in plugins are registered once at startup via `registerBuiltinWidgetPlugins()`. This function is idempotent — calling it multiple times registers each plugin only once.

### Creation

When a user creates a widget instance (`POST /widgets`), the widget type is validated against supported types. The default config from the plugin is used if no config is provided.

### Validation

Before every data resolution, the stored config is validated against the plugin's config schema. Validation is performed by converting the schema to Zod and parsing.

### Resolution

The resolver receives the validated, normalized config and performs the data fetch or computation. Resolver errors are caught and returned as `stale` or `error` envelopes — they never crash the API.

### Rendering

The client receives the envelope and calls the registered renderer with the full props. The renderer uses `BaseWidgetFrame` to handle state routing and shared UI presentation.

### Editing

If a plugin provides a `SettingsForm`, it is rendered in the settings modal. The form calls `onChange` with the new config, which the client persists via `PATCH /widgets/:id`.

---

## Error Handling

### Invalid config

If a widget's stored config fails schema validation, the resolver is not called. The client receives:

```json
{
  "state": "error",
  "data": null,
  "meta": { "errorCode": "INVALID_WIDGET_CONFIG" }
}
```

### Missing plugin

If `getWidgetPlugin()` returns `null` (unregistered widget type), the client receives:

```json
{
  "state": "error",
  "data": null,
  "meta": { "errorCode": "UNSUPPORTED_WIDGET_TYPE" }
}
```

### Resolver failure

Individual resolver failures (provider down, network error) should return `stale` or `empty` state rather than throwing. The resolve function signature returns a `Promise` — rejections propagate to the service layer as errors.

### Renderer fallback

The renderer receives `data: null` when `state` is `error` or `empty`. When using `BaseWidgetFrame`, pass `hasData={Boolean(data)}` and provide `emptyMessage` / `errorMessage` — the frame handles the fallback display automatically. Do not conditionally render `null` directly in the renderer.
