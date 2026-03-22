# Authenticated Integration Plugin Pattern

This document explains how to build Ambient Screen widget plugins that fetch data from third-party systems requiring user authentication (e.g. Google Calendar, CRM platforms, analytics tools, business dashboards).

> **See also:** [docs/AUTH_PLUGIN_GUIDE.md](../AUTH_PLUGIN_GUIDE.md) for the full platform-level specification of the integration connection and provider adapter architecture.

---

## Overview

Plugins that need authenticated third-party data must NOT own token storage or implement authentication flows themselves.

Instead, they follow a two-layer pattern:

1. **Integration connection layer** — the platform stores and manages the authenticated connection to a third-party provider (tokens, scopes, expiry)
2. **Plugin/widget layer** — the plugin references a connection ID in its config and delegates all provider communication to a provider adapter

This keeps authentication reusable and secure across all plugins that connect to the same provider.

---

## When This Pattern Applies

Use this pattern when your plugin needs to:

- Read from a user's Google Calendar account
- Fetch data from a CRM (Salesforce, HubSpot, etc.)
- Pull from a business analytics or reporting system
- Access any provider that requires OAuth or API key credentials tied to a specific user account

Do NOT use this pattern for:

- Public APIs that require no authentication (e.g. open-meteo weather, public RSS)
- APIs where a single system-level key is shared across all users

---

## Plugin Config Shape

An authenticated plugin's config must include:

```typescript
export interface MyCrmWidgetConfig {
  provider: "my-crm";               // identifies the provider adapter to use
  integrationConnectionId: string;  // UUID of the user's integration connection
  resourceId: string;               // provider-specific resource (dashboard ID, report ID, etc.)
  variant?: "summary" | "detail";  // display-specific parameters
}
```

Config schema:

```typescript
configSchema: {
  provider: ["my-crm"],
  integrationConnectionId: "string",
  resourceId: "string",
  variant: ["summary", "detail"],
}
```

**Rules:**
- Always include `provider` and `integrationConnectionId`
- Never store raw tokens, client secrets, or credentials in widget config
- Only store identifiers that reference server-side resources

---

## Manifest Declaration

Authenticated plugins should use a descriptive category. The `premium` field can be combined with integration requirements:

```typescript
manifest: {
  key: "myCrmWidget",
  version: "1.0.0",
  name: "CRM Dashboard",
  description: "Shows a summary from your connected CRM.",
  category: "productivity",
  defaultLayout: { w: 6, h: 3, minW: 4, minH: 2 },
  refreshPolicy: { intervalMs: 300000 },  // 5 minutes
  premium: true,  // if gated by premium plan
}
```

---

## API Resolver

The resolver is responsible for loading the connection, validating ownership, and fetching data through the provider adapter.

```typescript
// apps/api/src/modules/widgetData/resolvers/myCrmWidget.resolver.ts

export async function resolveMyCrmWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
  userId: string;  // the authenticated user making the request
}): Promise<WidgetDataEnvelope<MyCrmWidgetData, "myCrmWidget">> {
  const config = toMyCrmWidgetConfig(input.widgetConfig);

  // 1. Load the integration connection
  const connection = await integrationConnectionRepository.findById(
    config.integrationConnectionId
  );

  // 2. Validate existence and ownership
  if (!connection) {
    return errorEnvelope(input.widgetInstanceId, "myCrmWidget", "CONNECTION_NOT_FOUND");
  }
  if (connection.userId !== input.userId) {
    return errorEnvelope(input.widgetInstanceId, "myCrmWidget", "CONNECTION_ACCESS_DENIED");
  }

  // 3. Validate provider compatibility
  if (connection.provider !== config.provider) {
    return errorEnvelope(input.widgetInstanceId, "myCrmWidget", "PROVIDER_MISMATCH");
  }

  // 4. Use the provider adapter to fetch and normalize data
  try {
    const adapter = getProviderAdapter(connection.provider);
    await adapter.refreshConnectionIfNeeded(connection);
    const raw = await adapter.fetch({ connection, resourceId: config.resourceId });
    const normalized = adapter.normalize(raw, config);

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "myCrmWidget",
      state: "ready",
      data: normalized,
      meta: {
        fetchedAt: new Date().toISOString(),
        source: connection.provider,
      },
    };
  } catch (err) {
    return staleOrErrorEnvelope(input.widgetInstanceId, "myCrmWidget", err);
  }
}
```

**Resolver rules:**
- Always validate `connection.userId === authenticatedUser.id` before using the connection
- Never pass raw tokens into the resolver input
- Delegate token refresh to the provider adapter — do not implement it in the resolver
- Return `state: "error"` for auth failures (revoked, missing connection)
- Return `state: "stale"` when cached data is available and the provider is temporarily unavailable

---

## Error States for Authenticated Plugins

Authenticated plugins must handle more error conditions than public-data plugins:

| Error condition | `state` | `meta.errorCode` |
|---|---|---|
| Integration connection not found | `"error"` | `"CONNECTION_NOT_FOUND"` |
| Connection belongs to another user | `"error"` | `"CONNECTION_ACCESS_DENIED"` |
| Provider mismatch in config | `"error"` | `"PROVIDER_MISMATCH"` |
| Token expired and refresh failed | `"error"` | `"AUTH_REFRESH_FAILED"` |
| App authorization revoked | `"error"` | `"AUTH_REVOKED"` |
| Provider outage or rate limit | `"stale"` or `"error"` | `"PROVIDER_FAILURE"` |
| User lost access to resource | `"error"` | `"RESOURCE_ACCESS_DENIED"` |

---

## Client Renderer

The client renderer for an authenticated plugin works exactly like any other renderer. It receives normalized widget data — it does not know or care that the data came from an authenticated source.

```typescript
export function MyCrmWidgetRenderer({ state, data, config }: WidgetRendererProps<"myCrmWidget">) {
  const hasData = Boolean(data?.kpiValues?.length);

  return (
    <BaseWidgetFrame
      title="CRM Dashboard"
      icon="star"
      state={state}
      hasData={hasData}
      emptyMessage="No dashboard data available."
      errorMessage="Unable to connect to CRM. Check your integration connection."
    >
      {data && (
        <View>
          {data.kpiValues.map((kpi) => (
            <KpiRow key={kpi.label} label={kpi.label} value={kpi.value} />
          ))}
        </View>
      )}
    </BaseWidgetFrame>
  );
}
```

**Rules:**
- The client never calls the third-party provider API
- The client never handles tokens, OAuth redirects, or auth flows
- The error message can hint that a connection issue exists, but does not expose technical details

---

## Settings Form for Connection Selection

Authenticated plugins typically need a two-phase settings form:

**Phase 1 — Connection selection:** The user picks one of their existing integration connections for the provider.

**Phase 2 — Resource selection:** The user picks the specific resource (calendar, dashboard, report) from the selected connection.

```typescript
export function MyCrmWidgetSettingsForm({ config, onChange, disabled }: WidgetSettingsFormProps<"myCrmWidget">) {
  // Phase 1: pick a connection
  // Phase 2: pick a resource within that connection
  // onChange({ ...config, integrationConnectionId: selectedId, resourceId: selectedResourceId })
}
```

**Rules:**
- Never ask the user to paste a token or API key
- Never show raw connection credentials in the settings form
- Use connection labels (e.g. "Peppe's Salesforce Workspace") to identify connections

---

## Security Rules

1. **Ownership** — `connection.userId` must equal the requesting user's ID. Enforce this in the resolver, not just the route.
2. **No token storage in config** — the `integrationConnectionId` is a reference; the token lives in the integration layer.
3. **No direct client-side provider calls** — all authenticated provider requests go through the API.
4. **No cross-user connection sharing** — users may not reference connections they do not own.
5. **Resolver scope** — plugin resolvers receive pre-scoped input; they should not perform their own user lookups to find "any" connection for a provider.

---

## Anti-Patterns to Avoid

```typescript
// ❌ Never store tokens in config
config: {
  provider: "google-calendar",
  accessToken: "ya29.a0...",  // WRONG
}

// ❌ Never call provider APIs from the client
// In renderer:
const events = await fetch("https://www.googleapis.com/calendar/v3/events", {
  headers: { Authorization: `Bearer ${config.accessToken}` },  // WRONG
});

// ❌ Never bypass ownership validation
const connection = await db.integrationConnection.findFirst({
  where: { provider: config.provider },  // WRONG — any user's connection
});

// ✅ Correct — reference by ID, validate ownership
const connection = await db.integrationConnection.findUnique({
  where: { id: config.integrationConnectionId },
});
if (connection?.userId !== input.userId) throw new ForbiddenError();
```

---

## Plugin Author Checklist

- [ ] Config includes `provider` and `integrationConnectionId` fields
- [ ] Config schema uses `"string"` for `integrationConnectionId`
- [ ] Resolver validates connection existence and ownership before use
- [ ] Resolver delegates token refresh to the provider adapter
- [ ] Resolver handles all auth error conditions and returns appropriate envelope states
- [ ] Client renderer displays a meaningful error message when connection fails
- [ ] Settings form provides connection selection UI (no raw token inputs)
- [ ] No tokens, secrets, or credentials stored in widget config or client state
- [ ] No third-party provider calls from the client

---

## Full Platform Specification

For the complete architecture of the integration connection and provider adapter layers, including the full provider adapter contract, caching pattern, and multi-account considerations, see:

[docs/AUTH_PLUGIN_GUIDE.md](../AUTH_PLUGIN_GUIDE.md)
