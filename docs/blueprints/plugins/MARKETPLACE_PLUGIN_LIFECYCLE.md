> Status: Non-canonical
> Type: Blueprint
> Authority: Not the primary source of truth when a canonical doc exists

# Marketplace Plugin Lifecycle

This document describes the complete lifecycle of a plugin in the Ambient Screen platform — from authoring through catalog approval, user installation, and runtime availability.

Understanding this lifecycle is important because plugin state exists at two separate levels that must both be satisfied for a plugin to be usable:

1. **Catalog state** — what the marketplace knows about the plugin (metadata, versions, approval)
2. **Runtime state** — whether the plugin code is registered in the in-memory registry and can be executed

---

## Lifecycle Overview

```
Author creates plugin
        ↓
Author publishes version (status: PENDING)
        ↓
Admin reviews and approves (status: APPROVED)
        ↓
Plugin appears in marketplace (GET /plugins)
        ↓
User installs plugin (POST /me/plugins/:id)
        ↓
User enables/disables plugin (PATCH /me/plugins/:id)
        ↓
Enabled installed plugin is usable in widget creation and runtime
```

---

## Stage 1 — Author Creates a Plugin

A plugin author registers their plugin using the developer API:

```
POST /developer/plugins
Body: { name, description, category }
```

This creates a `Plugin` record in the database with:
- `status: PENDING`
- `isApproved: false`

The plugin is not visible in the marketplace at this stage. No version has been published yet.

**Key constraint:** Plugin keys are derived from the plugin name and must be globally unique. Authors cannot register a key that conflicts with an existing plugin.

---

## Stage 2 — Author Publishes a Version

The author publishes a version of their plugin:

```
POST /developer/plugins/:pluginId/versions
Body: {
  version: "1.0.0",
  manifest: { key, version, name, description, category, defaultLayout, refreshPolicy },
  entryPoint: "https://cdn.example.com/my-plugin/1.0.0/index.js",
  changelog: "Initial release."
}
```

This creates a `PluginVersion` record with:
- `status: PENDING`
- `isApproved: false`
- `isActive: false`

The version is not yet active. The plugin is still not visible in the marketplace.

**Important:** A plugin is blocked from installation until both the `Plugin` record and at least one `PluginVersion` record are approved and active.

---

## Stage 3 — Admin Moderates and Approves

An admin reviews the plugin and decides whether to approve it:

```
PATCH /admin/plugins/:pluginId
Body: { isApproved: true }
```

This sets:
- `Plugin.isApproved = true`
- `Plugin.status = APPROVED`

The admin also activates the approved version:
- Sets `PluginVersion.isApproved = true`
- Sets `PluginVersion.isActive = true` (only one version is active per plugin at a time)

If the plugin is rejected:
- `Plugin.status = REJECTED`
- The plugin remains invisible in the marketplace

---

## Stage 4 — Plugin Appears in Marketplace

Once a plugin has `isApproved = true` on the `Plugin` record **and** at least one `PluginVersion` with `isApproved = true` and `isActive = true`, the plugin appears in the public marketplace:

```
GET /plugins         → lists all approved plugins with their active version
GET /plugins/:key    → returns a single plugin by key
```

Each response includes the active version's `manifestJson` which describes the plugin's layout defaults, refresh policy, and other metadata.

**Distinction:** Appearing in the marketplace means the plugin is discoverable and installable. It does not mean the plugin code is running in any user's runtime yet.

---

## Stage 5 — User Installs a Plugin

A user installs a plugin from the marketplace:

```
POST /me/plugins/:pluginId
```

This creates an `InstalledPlugin` record:
- `userId` → the installing user
- `pluginId` → the installed plugin
- `isEnabled: true` (enabled by default)

**Installation guard:** The API rejects installation if:
- The plugin does not exist
- The plugin is not approved (`isApproved: false`)

Installing a plugin does not automatically make it available in the widget creation flow — the runtime registry must also have the plugin code registered. For marketplace plugins that require dynamic loading, the runtime registry would need to load the plugin from the `entryPoint` URL after installation. Built-in plugins are always registered at startup regardless of marketplace state.

---

## Stage 6 — User Enables or Disables the Plugin

After installation, the user can toggle the plugin on or off:

```
PATCH /me/plugins/:pluginId
Body: { isEnabled: true | false }
```

This updates `InstalledPlugin.isEnabled`.

Disabling a plugin prevents data resolution for that plugin's widget instances. The API returns a `403 Forbidden` response when a disabled plugin's widget data is requested. The client should show the widget in an error state.

The user can re-enable the plugin at any time.

---

## Stage 7 — Runtime Availability

A plugin is usable at runtime when all of these conditions are true:

1. **Catalog**: `Plugin.isApproved = true`
2. **Catalog**: At least one `PluginVersion` with `isApproved = true` and `isActive = true`
3. **Catalog**: `InstalledPlugin` exists for the user with `isEnabled = true`
4. **Runtime**: Plugin code is registered in the in-memory runtime registry on both API and client

For **built-in plugins** (clockDate, weather, calendar), conditions 1–3 are not checked — built-in plugins bypass the marketplace installation guard. They are always registered at startup.

For **marketplace plugins**, all four conditions must be met.

---

## Plugin States Reference

### Plugin record states

| `isApproved` | `status` | Marketplace visible |
|---|---|---|
| `false` | `PENDING` | No |
| `false` | `REJECTED` | No |
| `true` | `APPROVED` | Yes (if active version exists) |

### PluginVersion record states

| `isApproved` | `isActive` | Available |
|---|---|---|
| `false` | `false` | No — pending moderation |
| `true` | `false` | No — approved but not yet activated |
| `true` | `true` | Yes — this is the active version |

Only one version can be `isActive = true` per plugin at a time. When a new version is activated, the previous version's `isActive` is set to `false`.

### InstalledPlugin record states

| `isEnabled` | Effect |
|---|---|
| `true` | Plugin usable for this user |
| `false` | Widget data requests return 403 |

---

## Active Version Resolution

When a marketplace plugin is requested (either from `GET /plugins` or during runtime data resolution), the active version is resolved as:

```
PluginVersion WHERE pluginId = ? AND isApproved = true AND isActive = true
```

This is a single-row lookup — only one version is active at a time. Version history is retained in the database but only the active version is served to users.

---

## Separation from Runtime Registry

The marketplace metadata registry (database) and the runtime plugin registry (in-memory) are independent. This separation matters in these scenarios:

**Approved but not deployed:** A plugin is approved in the marketplace and users can install it, but the runtime code is not yet registered. Widget data requests will return `UNSUPPORTED_WIDGET_TYPE` errors until the runtime is updated.

**Built-in plugins:** The clockDate, weather, and calendar plugins are registered at startup without any marketplace entry. Users do not need to install them. They are always available.

**Marketplace plugins at runtime:** When a marketplace plugin is loaded, the plugin code (from `entryPoint`) must be registered in the runtime registry. The current platform does not implement dynamic plugin loading — this is a future capability. All currently active plugins are registered as built-ins at startup.

---

## Security Constraints

- Only approved plugins can be installed
- A user can only install and use plugins they own (`InstalledPlugin.userId = authenticatedUser.id`)
- The API validates installation and enabled status before resolving widget data for any DB-registered plugin
- Built-in plugins bypass this check — they are trusted and always available

---

## API Route Reference

| Method | Path | Description |
|---|---|---|
| `GET` | `/plugins` | List all approved marketplace plugins |
| `GET` | `/plugins/:key` | Get a specific plugin by key |
| `POST` | `/developer/plugins` | Author: create a new plugin |
| `POST` | `/developer/plugins/:id/versions` | Author: publish a new version |
| `GET` | `/me/plugins` | List installed plugins for the current user |
| `POST` | `/me/plugins/:id` | Install a plugin |
| `PATCH` | `/me/plugins/:id` | Enable or disable an installed plugin |
| `DELETE` | `/me/plugins/:id` | Uninstall a plugin |
| `PATCH` | `/admin/plugins/:id` | Admin: approve or reject a plugin |
