> Status: Non-canonical
> Type: Blueprint
> Authority: Not the primary source of truth when a canonical doc exists

# Plugin Registry Architecture

This document explains how plugins are registered and resolved across the full Ambient Screen system. There are two distinct registries that serve different purposes: the **runtime plugin registry** and the **marketplace metadata registry**.

---

## Two Registries — Different Concerns

| Registry | Where | Purpose |
|---|---|---|
| Runtime registry | In-memory `Map` in each process | Resolve widget data (API) and render widgets (client) |
| Marketplace metadata registry | PostgreSQL `Plugin` / `PluginVersion` tables | Track plugin catalog, approval state, versions, and user installs |

These registries are independent. A plugin can exist in the marketplace registry (approved, installable) before its runtime code is deployed. A built-in plugin can exist in the runtime registry without any marketplace entry.

---

## Runtime Plugin Registry

The runtime registry is a `Map<WidgetKey, PluginModule>` on each side of the system. Plugins are registered at startup and looked up at runtime during data resolution (API) and rendering (client).

```
Startup:
  registerBuiltinWidgetPlugins()
  └── registerWidgetPlugin(clockDateWidgetPlugin)
  └── registerWidgetPlugin(weatherWidgetPlugin)
  └── registerWidgetPlugin(calendarWidgetPlugin)

Runtime (API):
  GET /widget-data/:id
  └── widgetDataService.getWidgetDataForUser()
      └── getWidgetPlugin(widget.type)
          └── plugin.api.resolveData(input)

Runtime (Client):
  renderWidgetFromEnvelope(envelope)
  └── renderWidgetFromKey(envelope.widgetKey, input)
      └── getWidgetPlugin(widgetKey)
          └── plugin.client.Renderer(props)
```

---

## API Registry

**Source:** `apps/api/src/modules/widgets/widgetPluginRegistry.ts`

### Data structure

```typescript
const pluginsByKey = new Map<WidgetKey, WidgetApiPluginModule<WidgetKey>>();
```

A module-level `Map` keyed by `WidgetKey`. The map persists for the lifetime of the API process.

### Functions

```typescript
// Register a plugin. Throws if the key is already registered.
registerWidgetPlugin<TKey extends WidgetKey>(plugin: WidgetApiPluginModule<TKey>): void

// Look up a plugin by key. Returns null if not found.
getWidgetPlugin(widgetKey: WidgetKey): WidgetApiPluginModule<WidgetKey> | null

// Return all registered plugins.
listWidgetPlugins(): WidgetApiPluginModule<WidgetKey>[]

// Return all manifests (without implementation).
listWidgetPluginManifests(): WidgetPluginManifest<WidgetKey>[]

// Return the config schema for a key, or null.
getWidgetPluginConfigSchema(widgetKey: WidgetKey): WidgetConfigSchema | null

// Return the default config for a key, or null.
getWidgetPluginDefaultConfig(widgetKey: WidgetKey): WidgetConfigByKey[WidgetKey] | null

// Clear the registry. For use in tests only.
resetWidgetPluginRegistryForTests(): void
```

### How registration works

```typescript
export function registerWidgetPlugin<TKey extends WidgetKey>(
  plugin: WidgetApiPluginModule<TKey>,
) {
  const existing = pluginsByKey.get(plugin.manifest.key);
  if (existing) {
    throw new Error(`Duplicate widget plugin key: ${plugin.manifest.key}`);
  }
  pluginsByKey.set(plugin.manifest.key, plugin as unknown as WidgetApiPluginModule<WidgetKey>);
}
```

Registration fails fast on duplicate keys. This prevents accidental shadowing of existing plugins.

### How lookup is used by the service

```typescript
// apps/api/src/modules/widgetData/widget-data.service.ts

const plugin = getWidgetPlugin(widgetType);

if (!plugin?.api?.resolveData) {
  return {
    widgetInstanceId: widget.id,
    widgetKey: widgetType,
    state: "error",
    data: null,
    meta: {
      errorCode: "UNSUPPORTED_WIDGET_TYPE",
      message: `Unsupported widget type: ${widget.type}`,
    },
  };
}
```

`getWidgetPlugin` returns `null` for unknown keys — it never throws. The service converts `null` into a safe error envelope. This means a missing plugin causes the affected widget to show an error state rather than crashing the entire response.

---

## API Built-in Registration

**Source:** `apps/api/src/modules/widgets/registerBuiltinPlugins.ts`

```typescript
let registered = false;

export function registerBuiltinWidgetPlugins() {
  if (registered) return;

  registerWidgetPlugin(clockDateWidgetPlugin);
  registerWidgetPlugin(weatherWidgetPlugin);
  registerWidgetPlugin(calendarWidgetPlugin);

  registered = true;
}

export function resetBuiltinWidgetPluginRegistrationForTests() {
  registered = false;
}
```

**Idempotency:** The `registered` flag ensures plugins are only registered once even if `registerBuiltinWidgetPlugins()` is called multiple times. This is important because the function is called lazily from multiple service files and tests may trigger it via multiple import paths.

**Call sites:** `registerBuiltinWidgetPlugins()` is called at the top of `widget-resolvers.ts` and `widget-contracts.ts` — the first time either is imported, all built-in plugins are registered.

---

## Client Registry

**Source:** `apps/client/src/widgets/pluginRegistry.tsx`

### Data structure

```typescript
const pluginsByKey = new Map<WidgetKey, WidgetClientPluginModule<WidgetKey, React.ReactNode>>();
```

Identical structure to the API registry, but holds `WidgetClientPluginModule` instances (with `client.Renderer`) instead of API plugin modules.

### Functions

```typescript
// Register a client plugin. Throws on duplicate key.
registerWidgetPlugin<TKey extends WidgetKey>(plugin: WidgetClientPluginModule<TKey, React.ReactNode>): void

// Look up a plugin by key. Returns null if not found.
getWidgetPlugin(widgetKey: WidgetKey): WidgetClientPluginModule<WidgetKey, React.ReactNode> | null

// Return all registered plugins.
listWidgetPlugins(): WidgetClientPluginModule<WidgetKey, React.ReactNode>[]

// Return all manifests.
listWidgetPluginManifests(): WidgetPluginManifest<WidgetKey>[]

// Return refresh interval in ms for a key, or null.
getWidgetRefreshIntervalMs(widgetKey: WidgetKey | null | undefined): number | null

// Return config schema for a key, or null.
getWidgetConfigSchema(widgetKey: WidgetKey): WidgetConfigSchema | null

// Return default config for a key, or null.
getWidgetDefaultConfig(widgetKey: WidgetKey): WidgetConfigByKey[WidgetKey] | null

// Return the SettingsForm component for a key, or undefined.
getWidgetSettingsForm(widgetKey: WidgetKey): WidgetClientSettingsForm | undefined

// Return the Preview component for a key, or undefined.
getWidgetPreview(widgetKey: WidgetKey): WidgetClientPreview | undefined

// Render a widget by key with input props. Returns null if plugin not found.
renderWidgetFromKey(widgetKey: WidgetKey, input: { ... }): React.ReactNode

// Clear the registry. For use in tests only.
resetWidgetPluginRegistryForTests(): void
```

### How rendering works

```typescript
export function renderWidgetFromKey(
  widgetKey: WidgetKey,
  input: {
    widgetInstanceId: string;
    state: "ready" | "stale" | "empty" | "error";
    data: WidgetDataByKey[WidgetKey] | null;
    config?: Record<string, unknown>;
    meta?: WidgetDataMeta;
  },
): React.ReactNode {
  const plugin = getWidgetPlugin(widgetKey);
  if (!plugin) {
    return null;
  }

  const safeConfig = {
    ...plugin.defaultConfig,
    ...(input.config ?? {}),
  } as WidgetConfigByKey[WidgetKey];

  return plugin.client.Renderer({
    widgetInstanceId: input.widgetInstanceId,
    widgetKey,
    state: input.state,
    data: input.data as WidgetDataByKey[WidgetKey] | null,
    config: safeConfig,
    meta: input.meta,
  });
}
```

Key behaviors:

- **Missing plugin returns `null`** — the UI renders nothing for unknown widget types instead of crashing
- **Config is always complete** — `defaultConfig` is spread first, then user config on top, ensuring no config field is ever `undefined` when it reaches the renderer
- **Type casting** — the registry stores plugins as the widened `WidgetKey` type for map storage; the cast is safe because insertion enforces the correct type

### How `getWidgetRefreshIntervalMs` is used

The client's `DisplayScreen` uses the refresh interval from the plugin manifest to determine how often to poll:

```typescript
const intervalMs = getWidgetRefreshIntervalMs(activeWidget?.type ?? null);
// Used to set the polling interval for widget-data API calls
```

If the widget type is unknown or the plugin is not registered, this returns `null`, and the client does not poll.

---

## Client Built-in Registration

**Source:** `apps/client/src/widgets/registerBuiltinPlugins.ts`

Same idempotency pattern as the API side. Called lazily when the plugin registry is first used.

---

## Marketplace Metadata Registry

**Source:** `apps/api/src/modules/plugin-registry/` and `apps/api/src/modules/plugin-installation/`

The marketplace metadata registry tracks plugins and their lifecycle states in the database. This is separate from the in-memory runtime registry.

### Database models

**Plugin** — top-level record for a marketplace plugin

| Field | Type | Description |
|---|---|---|
| `id` | string (UUID) | Internal identifier |
| `key` | string | Unique plugin key (matches `WidgetKey` at runtime) |
| `name` | string | Display name in marketplace |
| `description` | string | Short description |
| `category` | string | Grouping category |
| `isPremium` | boolean | Whether the plugin requires a premium plan |
| `isApproved` | boolean | Whether admin has approved this plugin for marketplace visibility |
| `status` | `ModerationStatus` | `PENDING` \| `APPROVED` \| `REJECTED` |
| `approvedAt` | Date \| null | Timestamp of approval |
| `approvedBy` | string \| null | Admin user ID who approved |

**PluginVersion** — a specific published version of a plugin

| Field | Type | Description |
|---|---|---|
| `pluginId` | string | Foreign key to `Plugin` |
| `version` | string | SemVer version string |
| `manifestJson` | JSON | Full manifest payload (key, layout, refresh policy, etc.) |
| `entryPoint` | string | URL or path to the deployable plugin bundle |
| `changelog` | string \| null | Release notes |
| `isActive` | boolean | Whether this is the currently deployed version |
| `isApproved` | boolean | Whether admin has approved this version |
| `status` | `ModerationStatus` | `PENDING` \| `APPROVED` \| `REJECTED` |

**InstalledPlugin** — a user's installation of a marketplace plugin

| Field | Type | Description |
|---|---|---|
| `userId` | string | Owner of the installation |
| `pluginId` | string | Foreign key to `Plugin` |
| `isEnabled` | boolean | Whether the user has enabled or disabled this plugin |

### Plugin approval states

A plugin must pass through two independent approval checks before it is usable:

1. **Plugin approval** (`Plugin.isApproved`) — the plugin entry itself is approved. Controls marketplace visibility.
2. **Version approval** (`PluginVersion.isApproved` + `isActive`) — a specific version is approved and set as active. Controls which version is served.

A plugin is visible in the marketplace only when both `Plugin.isApproved = true` and at least one `PluginVersion` has `isApproved = true` and `isActive = true`.

### Install and enabled states

After a user installs a plugin (`POST /me/plugins/:pluginId`):

- `InstalledPlugin` is created with `isEnabled: true` by default
- The user can toggle `isEnabled` via `PATCH /me/plugins/:pluginId`
- The API enforces that only installed and enabled plugins can be used at runtime

Built-in plugins (registered only in the in-memory registry, not in the DB) bypass the installation check — they are available to all users by default.

---

## Safety

### Duplicate keys

Both runtime registries throw `Error` on duplicate key registration:

```
Error: Duplicate widget plugin key: clockDate
```

This is a programming error — it means two plugins with the same key were registered. It fails loudly at startup so it is caught immediately in development and tests.

### Missing plugins

`getWidgetPlugin()` returns `null` for unknown keys — it never throws. Callers are responsible for handling `null`:

- API service: returns an `error` state envelope with `errorCode: "UNSUPPORTED_WIDGET_TYPE"`
- Client `renderWidgetFromKey`: returns `null` React node (renders nothing)

This means a single missing plugin only affects its own widget instance. Other widgets on the same display continue to function normally.

### Invalid config

Invalid config is caught by `validateWidgetConfig()` in the API service before the plugin's resolver is called. The resolver never receives invalid config. Invalid config returns an `error` state envelope with `errorCode: "INVALID_WIDGET_CONFIG"`.

### Unapproved / uninstalled plugin runtime check

For marketplace plugins (those with a `Plugin` DB record), the API enforces installation and enabled status via `assertPluginInstalledAndEnabled()` before resolving widget data. This prevents users from accessing marketplace plugin data without a valid installation.

### Test isolation

Both runtime registries expose `resetWidgetPluginRegistryForTests()` which clears the internal map. Tests that register plugins must call this in `beforeEach` and `afterEach` to prevent cross-test pollution.

The API also exposes `resetBuiltinWidgetPluginRegistrationForTests()` to reset the idempotency flag, allowing tests to re-trigger built-in registration.

---

## Registry Diagram (full system)

```
packages/shared-contracts
  widgetBuiltinDefinitions
  ├── clockDate: { manifest, configSchema, defaultConfig }
  ├── weather:   { manifest, configSchema, defaultConfig }
  └── calendar:  { manifest, configSchema, defaultConfig }

apps/api (runtime registry)
  registerBuiltinWidgetPlugins()
  ├── clockDateWidgetPlugin  →  registerWidgetPlugin()  →  pluginsByKey["clockDate"]
  ├── weatherWidgetPlugin    →  registerWidgetPlugin()  →  pluginsByKey["weather"]
  └── calendarWidgetPlugin   →  registerWidgetPlugin()  →  pluginsByKey["calendar"]

  widgetDataService.getWidgetDataForUser(widgetId, userId)
  └── getWidgetPlugin(widget.type)
      ├── found  → plugin.api.resolveData(input) → WidgetDataEnvelope
      └── null   → error envelope { errorCode: "UNSUPPORTED_WIDGET_TYPE" }

apps/api (marketplace metadata registry — PostgreSQL)
  Plugin            { key, name, isPremium, isApproved, status }
  PluginVersion     { version, manifestJson, entryPoint, isActive, isApproved }
  InstalledPlugin   { userId, pluginId, isEnabled }

  pluginInstallationService.assertPluginInstalledAndEnabled(userId, pluginKey)
  └── only enforced for DB-registered (marketplace) plugins
      ├── not installed → 403 Forbidden
      └── disabled      → 403 Forbidden

apps/client (runtime registry)
  registerBuiltinWidgetPlugins()
  ├── clockDateWidgetPlugin  →  registerWidgetPlugin()  →  pluginsByKey["clockDate"]
  ├── weatherWidgetPlugin    →  registerWidgetPlugin()  →  pluginsByKey["weather"]
  └── calendarWidgetPlugin   →  registerWidgetPlugin()  →  pluginsByKey["calendar"]

  renderWidgetFromKey(widgetKey, input)
  └── getWidgetPlugin(widgetKey)
      ├── found  → plugin.client.Renderer(props) → React.ReactNode
      └── null   → null
```
