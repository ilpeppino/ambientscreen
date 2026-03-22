# M4.5 Widget Plugin System (Core)

## Scope

This milestone introduces an internal first-party plugin host model for widgets.

Implemented:
- shared plugin contract in `@ambient/shared-contracts`
- API plugin registry + built-in plugin registration
- client plugin registry + built-in plugin registration
- built-in plugin migration for `clockDate`, `weather`, and `calendar`

Not implemented:
- remote plugin loading
- execution of untrusted code
- runtime marketplace package installation

## Plugin Contract

Each plugin module provides:
- `manifest`
- `configSchema`
- `defaultConfig`
- `api.resolveData` (API host)
- `client.Renderer` (client host)
- optional `client.SettingsForm`
- optional `client.Preview`

Manifest includes:
- `key`
- `version`
- `name`
- `description`
- `category`
- `defaultLayout`
- `refreshPolicy`
- optional `premium`

## Version / Schema Readiness

- `manifest.version` is present for each built-in plugin.
- `configSchema` is centralized per plugin module and used by both API and client pathways.
- No runtime config migration layer is introduced yet; legacy config normalization remains in API contracts.
- Future schema migration can key off `(widgetKey, manifest.version)` and optional schema versions without changing host interfaces.

## Safety Model

- Duplicate plugin keys fail registration.
- Missing plugin lookup returns safe error envelopes.
- Invalid config returns safe error envelopes.
- One plugin failure does not crash full display layout resolution.
