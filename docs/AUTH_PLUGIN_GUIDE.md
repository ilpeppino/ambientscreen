# Authenticated Integration Plugin Pattern

## Overview

Some plugins need to fetch data from third-party systems that require user authentication, such as CRMs, calendars, helpdesk platforms, analytics tools, or internal business systems.

In Ambient Screen, plugins must NOT own authentication token storage or invent custom auth flows in isolation.

Instead, authenticated integrations follow a two-layer pattern:

1. Integration/auth layer
2. Plugin/widget layer

This keeps the system secure, reusable, and consistent across providers.

---

## Core Principle

A plugin should focus on:

- what data it needs
- how to validate its config
- how to resolve and normalize data
- how to render the result

A plugin should NOT be responsible for:

- securely storing third-party tokens
- implementing ad hoc token lifecycle logic
- bypassing ownership or access rules
- querying arbitrary user data without scoped connections

---

## Architecture Roles

### 1. User Auth Layer

This handles authentication into Ambient Screen itself.

Examples:
- email/password
- Google sign-in
- Apple sign-in

This is separate from third-party provider connections.

---

### 2. Integration Connection Layer

This stores the authenticated connection between an Ambient Screen user and a third-party provider.

Examples:
- Google Calendar account
- Salesforce connection
- HubSpot connection
- Jira connection
- Notion connection

An integration connection is the system-owned record that stores:

- provider name
- external account id
- account label
- scopes
- encrypted access token
- encrypted refresh token
- token expiry
- sync metadata

This is the source of truth for external provider authentication.

---

### 3. Provider Adapter Layer

A provider adapter encapsulates provider-specific fetching and normalization logic.

There are two categories:

#### Base Provider Adapter
Used for providers that do not require authenticated user connections.

Examples:
- weather APIs
- public RSS feeds

#### OAuth-Capable Provider Adapter
Used for providers that require user-linked authenticated access.

Examples:
- Google Calendar
- Salesforce
- HubSpot
- Microsoft Graph
- Jira Cloud

This adapter must support:

- requiresConnection = true
- validateConnection(connection)
- refreshConnectionIfNeeded(connection) when applicable
- fetch(input)
- normalize(raw, input)

---

### 4. Plugin / Widget Layer

The widget plugin uses the integration connection indirectly.

It does this by:

1. referencing a connection in widget config
2. asking the API resolver to fetch data through the provider adapter
3. returning a normalized widget envelope
4. rendering the data on the client

The plugin does not directly manage third-party authentication state.

---

## Standard Flow

### Step 1 — User Links an External Account

The user connects a third-party system through an integration flow.

Example:
- “Connect Google Calendar”
- “Connect Salesforce”
- “Connect Notion”

After successful auth, the backend stores an `IntegrationConnection`.

---

### Step 2 — Widget References the Connection

A widget config stores a reference to the linked connection.

Example pattern:

- provider
- integrationConnectionId
- additional provider-specific selection fields

Examples:
- selected calendar IDs
- selected Salesforce object/report/dashboard
- selected workspace/project/account
- selected query or filter

---

### Step 3 — API Resolver Loads the Connection

When widget data is requested, the API:

1. loads the widget instance
2. reads widget config
3. loads the integration connection by ID
4. validates ownership and provider compatibility
5. validates the connection
6. refreshes token if needed
7. fetches provider data
8. normalizes it into the widget envelope

---

### Step 4 — Client Renders the Normalized Data

The client never talks directly to the third-party provider.

The client only receives normalized widget data from the Ambient Screen API and renders it.

---

## Recommended Widget Config Pattern

For any authenticated external integration, widget config should follow this shape:

- provider
- integrationConnectionId
- source-specific parameters
- display-specific parameters

Example conceptual config:

- provider: "salesforce"
- integrationConnectionId: "uuid"
- resourceType: "dashboard"
- resourceId: "pipeline-123"
- variant: "summary"

Important:
- never store raw tokens in widget config
- never store client-only provider credentials in widget config

---

## Ownership and Security Rules

### Rule 1 — Connection Ownership
A user may only use integration connections they own.

The API must enforce:
- connection.userId === authenticatedUser.id

### Rule 2 — Plugin Resolver Scope
Plugin resolvers must only receive integration connections already validated and scoped by the API layer.

Plugins must not bypass ownership validation.

### Rule 3 — No Token Storage in Plugins
Plugins must not persist tokens or secrets on their own.

All token storage belongs to the integration connection layer.

### Rule 4 — No Client-side Provider Auth Logic
The client should not directly call provider APIs for authenticated widget data.

The backend is the single place for:
- token validation
- refresh logic
- provider requests
- normalization

---

## Recommended Provider Adapter Contract

An authenticated provider adapter should support:

- providerKey
- requiresConnection
- validateConnection(connection)
- refreshConnectionIfNeeded(connection)
- fetch(input)
- normalize(raw, input)
- getCacheKey(input)
- getTtlSeconds(input)

### Responsibilities

#### validateConnection
Checks that the connection is usable:
- provider matches
- token exists
- token format is valid
- required scopes are present

#### refreshConnectionIfNeeded
Refreshes tokens when expiry logic requires it.

#### fetch
Performs the provider API call.

#### normalize
Transforms provider-specific raw data into the widget’s normalized response shape.

---

## Caching Pattern

Authenticated integrations should still use normalized caching when appropriate.

Cache keys should be deterministic and based on:

- provider
- user-scoped connection
- selected resource(s)
- query parameters relevant to output

Do not cache raw provider responses blindly if they contain unnecessary or sensitive payloads.

Prefer caching normalized data.

---

## Error Handling Pattern

Authenticated integration plugins must handle at least these states:

### 1. Invalid Connection
Examples:
- token missing
- token expired and refresh failed
- revoked app authorization

Result:
- widget state = error
- safe message returned in widget meta

### 2. Missing Connection
Examples:
- integrationConnectionId not found
- plugin configured against deleted connection

Result:
- widget state = error

### 3. Provider Failure
Examples:
- 429 rate limit
- 500 provider outage
- malformed provider response

Result:
- widget state = stale or error depending on cache availability

### 4. Access Denied
Examples:
- user lost access to a selected report/folder/project/object

Result:
- widget state = error
- safe access-denied message

---

## Settings UI Pattern

A plugin that depends on authenticated integrations should typically expose settings UI in two phases:

### Phase 1 — Connection Selection
User selects one of their available integration connections for the provider.

### Phase 2 — Resource Selection
User selects provider-specific resources, for example:
- calendars
- dashboards
- projects
- saved searches
- reports
- pipelines

The plugin settings form should never ask the user to paste raw access tokens.

---

## Example Pattern: CRM or Business System Plugin

A CRM-like plugin might use:

### Integration Connection
- provider: "crm-system"
- accountLabel: "Peppe Sales Workspace"
- encrypted tokens
- scopes
- expiry metadata

### Widget Config
- provider: "crm-system"
- integrationConnectionId: "uuid"
- resourceType: "dashboard"
- resourceId: "sales-overview"
- variant: "summary"

### Resolver Flow
1. load connection
2. validate ownership
3. refresh token if needed
4. fetch dashboard/report data
5. normalize into:
   - title
   - KPI values
   - trend labels
   - last updated timestamp

### Renderer
Render the normalized data only.

---

## Plugin Author Checklist

If your plugin needs authenticated third-party data, you must:

1. define provider in config
2. store integrationConnectionId in config
3. validate provider-specific config
4. implement resolver on top of a provider adapter
5. never store tokens in config
6. never query third-party APIs directly from client
7. return normalized widget data envelope
8. handle revoked/expired connections safely

---

## Anti-Patterns to Avoid

Do NOT:

- store raw access tokens in widget config
- implement OAuth callback logic inside widget renderer
- call third-party provider APIs directly from the client for secured data
- bypass integration connection ownership checks
- create plugin-specific secret storage outside the integration system
- assume one provider account per user without explicit connection selection

---

## Recommended Future Extensions

Later, the platform can support:

- provider-specific connection pickers
- multi-account integrations per provider
- shared enterprise/workspace connections
- scoped permissions per plugin capability
- connection health diagnostics in admin UI

---

## Summary

The correct pattern for authenticated third-party plugin integrations is:

1. user authenticates to external system
2. backend stores an IntegrationConnection
3. widget config references that connection
4. provider adapter validates/refreshes/fetches
5. resolver normalizes the result
6. client renders only the normalized widget data

This keeps authentication reusable, secure, and independent from widget rendering.
