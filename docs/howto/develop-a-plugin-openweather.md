# How to Develop a Plugin

This guide uses the OpenWeather-backed `weather` widget as the concrete example.

In the codebase, the widget is named `weather`, while OpenWeather is the data provider behind it. The flow below covers the full path from implementation to dashboard usage:

1. define the shared contract
2. fetch and normalize data on the API
3. render and configure the widget on the client
4. register the plugin at startup
5. install and use it in the dashboard

---

## What You Create or Update

### Shared contracts

| File | Purpose |
|---|---|
| `packages/shared-contracts/src/widgets/plugin-sdk.ts` | Defines the builtin manifest, default config, config schema, and plugin types shared by API and client. |
| `packages/shared-contracts/src/index.ts` | Only needed if you are introducing a brand-new `WidgetKey`, config type, or data type. The existing OpenWeather example already has `weather` in this file. |

### API side

| File | Purpose |
|---|---|
| `apps/api/src/modules/widgetData/providers/openweather.provider.ts` | Talks to OpenWeather, handles API key access, and normalizes the provider response. |
| `apps/api/src/modules/widgetData/resolvers/weather.resolver.ts` | Normalizes widget config, calls the provider, and returns the widget data envelope. |
| `apps/api/src/modules/widgets/plugins/weather.plugin.ts` | Wires the shared manifest, config schema, default config, and API resolver into a single plugin module. |
| `apps/api/src/modules/widgets/registerBuiltinPlugins.ts` | Registers the API plugin at startup so the backend can resolve widget data. |

### Client side

| File | Purpose |
|---|---|
| `apps/client/src/widgets/weather/renderer.tsx` | Renders the widget UI in the dashboard and display surfaces. |
| `apps/client/src/widgets/weather/settings-form.tsx` | Lets the user configure weather-specific fields such as city, country code, units, and forecast count. |
| `apps/client/src/widgets/weather/preview.tsx` | Provides the preview card shown in the widget picker and marketplace surfaces. |
| `apps/client/src/widgets/plugins/weather.plugin.tsx` | Wires the shared manifest, config schema, default config, and client components into a single plugin module. |
| `apps/client/src/widgets/registerBuiltinPlugins.ts` | Registers the client plugin at startup so the dashboard can render it. |

### Optional supporting files

| File | Purpose |
|---|---|
| `apps/client/src/widgets/weather/index.ts` | Small metadata entry for the widget feature folder. |
| `apps/api/src/modules/widgetData/widget-resolvers.ts` | Usually does not need manual edits for a builtin plugin because it reads from the runtime registry. |
| `apps/client/src/widgets/widget.registry.tsx` | Usually does not need manual edits for a builtin plugin because it reads from the runtime registry. |

---

## Implementation Steps

### 1. Define the shared contract

Start in `packages/shared-contracts/src/widgets/plugin-sdk.ts`.

For the OpenWeather example, the important pieces are:

- `manifest`
- `defaultConfig`
- `configSchema`

The builtin `weather` definition already declares:

- key: `weather`
- name: `Weather`
- category: `environment`
- default config values such as `city`, `units`, and `forecastSlots`
- config schema entries for the supported fields

If you are creating a new plugin key, also update `packages/shared-contracts/src/index.ts` so the key, config type, and data type are part of the shared TypeScript contract.

### 2. Implement the provider

Create or update `apps/api/src/modules/widgetData/providers/openweather.provider.ts`.

This file should:

- read the OpenWeather API key from server-side environment variables
- call the OpenWeather endpoints
- normalize the response into a shape the rest of the app understands
- handle partial failures gracefully, such as missing forecast data

Keep provider code isolated from widget-specific rendering. The provider should know how to talk to OpenWeather, not how the widget is displayed.

### 3. Implement the resolver

Create or update `apps/api/src/modules/widgetData/resolvers/weather.resolver.ts`.

This file should:

- accept an unknown widget config
- normalize and validate the config defensively
- call the provider with the normalized inputs
- map provider output into the widget data envelope
- return safe fallback states such as `empty`, `stale`, or `error` when needed

For the OpenWeather example, the resolver is what converts:

- a city and optional country code
- a unit selection
- a forecast slot count

into normalized weather data for the client.

### 4. Wire the API plugin module

Create or update `apps/api/src/modules/widgets/plugins/weather.plugin.ts`.

This module connects:

- the shared manifest
- the config schema
- the default config
- the API resolver

The plugin module should stay thin. Its job is wiring, not business logic.

### 5. Register the API plugin at startup

Update `apps/api/src/modules/widgets/registerBuiltinPlugins.ts`.

The built-in plugin must be registered here so the backend can resolve widget data during requests.

For the OpenWeather example, this is what makes the `weather` widget available to the resolver pipeline.

### 6. Implement the client renderer

Create or update `apps/client/src/widgets/weather/renderer.tsx`.

This component should:

- render only normalized widget data
- handle loading, empty, and error states through the shared widget frame
- avoid direct API calls
- avoid provider-specific logic

The renderer should focus on display only.

### 7. Add the settings UI

Create or update `apps/client/src/widgets/weather/settings-form.tsx`.

This file is what the user interacts with when configuring the widget in the dashboard.

For the weather example, it exposes:

- city
- optional country code
- temperature units
- forecast slot count

### 8. Add the preview UI

Create or update `apps/client/src/widgets/weather/preview.tsx`.

The preview is used in chooser surfaces such as the widget library or marketplace card previews.

Keep it lightweight and representative. It should help users understand what the widget does before they add it.

### 9. Wire the client plugin module

Create or update `apps/client/src/widgets/plugins/weather.plugin.tsx`.

This module connects:

- the shared manifest
- the config schema
- the default config
- the renderer
- the settings form
- the preview

This is the client-side counterpart to the API plugin module.

### 10. Register the client plugin at startup

Update `apps/client/src/widgets/registerBuiltinPlugins.ts`.

This is what makes the widget available to the dashboard UI and widget picker.

Without this registration step, the backend may know how to resolve the data, but the client will not know how to render the widget.

---

## How Registration Works

There are two registries in the current architecture:

- the runtime registry for widget execution and rendering
- the marketplace registry for catalog and installation state

For the built-in OpenWeather `weather` widget:

- it is registered in memory at app startup on both API and client
- it does not need a marketplace install record to function
- users can use it directly in the dashboard once both sides are registered

Registration is done by importing the plugin module and calling `registerWidgetPlugin(...)` inside the built-in registration files:

```ts
// API
apps/api/src/modules/widgets/registerBuiltinPlugins.ts

// Client
apps/client/src/widgets/registerBuiltinPlugins.ts
```

The registration helpers reject duplicate keys, so each widget key must be unique.

---

## How Installation Works

Installation depends on whether the plugin is builtin or marketplace-backed.

### Built-in OpenWeather example

In the current codebase, the OpenWeather-backed `weather` widget is a builtin plugin:

- no user install step is required
- no approval step is required
- once the app starts, the widget is available in the dashboard UI

### Marketplace plugin flow

If you later convert a plugin into a marketplace entry, the flow is:

1. create the plugin record in the registry
2. publish an approved version
3. approve the plugin in admin
4. the user installs it from the marketplace screen
5. the user can enable or disable it from their installed plugins list

The client uses the installed plugin APIs under `apps/client/src/services/api/pluginInstallationApi.ts`, and the dashboard state uses `apps/client/src/features/plugins/useInstalledPlugins.ts`.

Important limitation: the current platform does not do remote runtime loading for third-party code. In practice, marketplace plugins still need to be available to the runtime registry before the client can render them.

---

## End-User Dashboard Flow

Once the plugin is registered and available to the runtime:

1. the user opens the dashboard or widget picker
2. the widget appears in the available plugin list
3. the user adds the widget to a dashboard surface
4. the user opens settings and configures the widget
5. the API resolver fetches normalized weather data from OpenWeather
6. the client renderer displays the current weather and forecast

For the OpenWeather example, the important user-facing settings are:

- city
- country code
- units
- forecast slots

The dashboard should show the widget with a stable title, a preview, and consistent loading/error behavior.

---

## Recommended File Set for a New Weather-Style Plugin

If you are cloning the OpenWeather pattern for a new plugin, create these files:

- `packages/shared-contracts/src/widgets/plugin-sdk.ts`
- `packages/shared-contracts/src/index.ts` if you add a new `WidgetKey`
- `apps/api/src/modules/widgetData/providers/<provider>.provider.ts`
- `apps/api/src/modules/widgetData/resolvers/<widget>.resolver.ts`
- `apps/api/src/modules/widgets/plugins/<widget>.plugin.ts`
- `apps/api/src/modules/widgets/registerBuiltinPlugins.ts`
- `apps/client/src/widgets/<widget>/renderer.tsx`
- `apps/client/src/widgets/<widget>/settings-form.tsx`
- `apps/client/src/widgets/<widget>/preview.tsx`
- `apps/client/src/widgets/plugins/<widget>.plugin.tsx`
- `apps/client/src/widgets/registerBuiltinPlugins.ts`

If the widget is an existing builtin key like `weather`, you only update the matching `weather` files and the two registration files.

---

## Verification Checklist

- `cd apps/api && npm run typecheck`
- `cd apps/client && npx tsc --noEmit`
- confirm the API can resolve weather widget data
- confirm the client can render the weather widget
- confirm the widget appears in the dashboard widget picker
- confirm the settings form updates the widget config correctly

