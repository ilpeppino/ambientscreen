# Google OAuth + IntegrationConnection API Contract

**Status:** Canonical implementation contract
**Audience:** backend and frontend implementers
**Last updated:** 2026-03-25

---

## 1. Purpose

Define the backend API contract for Google OAuth and IntegrationConnection management used by authenticated plugins, starting with the Google Calendar widget.

This contract ensures:
- third-party OAuth lives in the integration layer, not in plugin code
- widget config references a connection instead of storing secrets
- the backend owns token validation, refresh, provider requests, and normalization
- the client only consumes safe, normalized responses

This follows the authenticated integration pattern and the current backend route/module architecture.

---

## 2. Architectural Position

### 2.1 Route group

All endpoints in this contract live under:

```
/integrations
```

This fits the existing REST route-module approach in the API, where route groups are organized by domain and implemented with routes → service → repository.

### 2.2 Responsibility boundaries

**The integration layer is responsible for:**
- creating and storing provider connections
- exchanging OAuth codes for tokens
- refreshing tokens
- validating provider access
- exposing safe connection summaries
- exposing provider resource pickers such as Google calendars

**Plugins are responsible for:**
- storing provider and integrationConnectionId in widget config
- validating plugin-specific config
- asking the API resolver for normalized widget data

**Plugins must not own tokens or OAuth flows.**

---

## 3. Data model contract

### 3.1 Backing table

The canonical V1 blueprint defines an `integration_connections` table with these core fields:

| Field | Type | Notes |
|-------|------|-------|
| id | string | Primary key |
| user_id | string | Foreign key to users |
| provider | string | e.g., "google" |
| status | string | Connection state |
| account_label | string | User-friendly label |
| external_account_id | string | Provider's account ID |
| scopes_json | json | Granted OAuth scopes |
| access_token_encrypted | string | Encrypted access token |
| refresh_token_encrypted | string | Encrypted refresh token |
| token_expires_at | timestamp | Token expiry time |
| metadata_json | json | Provider-specific metadata |
| last_synced_at | timestamp | Last successful sync |
| created_at | timestamp | Record creation |
| updated_at | timestamp | Last modification |

**Uniqueness constraint:** `(user_id, provider, external_account_id)`

### 3.2 Google connection rules

For Google Calendar V1:
- `provider` must be `"google"`
- one user may have multiple Google connections in the future
- reconnecting the same Google account should update the existing `(user_id, provider, external_account_id)` record instead of creating duplicates

This upsert behavior is consistent with the table shape and uniqueness rule in the architecture blueprint.

### 3.3 Recommended status values

Use these connection statuses:

| Status | Meaning |
|--------|---------|
| connected | Account is linked and tokens are valid |
| needs_reauth | Token expired or scope was revoked |
| revoked | User disconnected the account |
| error | Provider returned a transient error |

**Note:** The blueprint confirms the table has a status field, but does not prescribe these exact four values. These values are a design recommendation layered on top of the canonical table shape.

---

## 4. Security contract

### 4.1 Authentication

All `/integrations` endpoints are JWT-protected except the OAuth callback, which is validated through signed OAuth state. This is consistent with the platform security model where HTTP routes are JWT-protected except explicit public auth/health routes.

### 4.2 Ownership

For any endpoint that reads or mutates an integration connection, the backend must enforce:

```
connection.userId === authenticatedUser.id
```

This is explicitly required by the authenticated integration pattern.

### 4.3 Token handling

The backend must enforce all of the following:

- tokens are stored only in the integration connection layer
- tokens are never returned to the client
- tokens are never stored in widget config
- plugins never implement provider auth directly

These rules are explicit in the authenticated integration guide.

### 4.4 Provider compatibility

Before using a connection for Google resources, the backend must verify that the selected connection belongs to the Google provider. Provider compatibility validation is explicitly part of the documented resolver flow.

---

## 5. OAuth scope contract

### 5.1 V1 scope

Use the minimum scope required for the read-only calendar widget:

```
https://www.googleapis.com/auth/calendar.readonly
```

This scope allows reading calendar events without modification permissions.

---

## 6. Endpoint overview

V1 includes these eight endpoints:

| Method | Path | Purpose |
|--------|------|---------|
| GET | /integrations | List user's connections |
| GET | /integrations/:integrationConnectionId | Get single connection |
| PATCH | /integrations/:integrationConnectionId | Update connection metadata |
| DELETE | /integrations/:integrationConnectionId | Disconnect provider account |
| POST | /integrations/:integrationConnectionId/refresh | Validate and refresh token |
| GET | /integrations/google/start | Initiate OAuth flow |
| GET | /integrations/google/callback | Complete OAuth flow |
| GET | /integrations/google/calendars | List available calendars |

This endpoint set supports the documented two-phase settings flow: connection selection first, then provider-specific resource selection such as calendars.

---

## 7. Shared DTOs

### 7.1 IntegrationConnectionSummary

Response-safe DTO returned to clients.

**Fields:**
```ts
{
  id: string;
  provider: "google";
  status: "connected" | "needs_reauth" | "revoked" | "error";
  accountLabel: string | null;
  accountEmail: string | null;
  externalAccountId: string | null;
  scopes: string[];
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}
```

**Rules:**
- must never include access token
- must never include refresh token
- must never include raw provider token response
- may include non-sensitive metadata derived from metadata_json

This DTO shape is derived from the canonical `integration_connections` fields and the documented rule that clients receive safe normalized data only.

### 7.2 IntegrationConnectionListResponse

```ts
{
  items: IntegrationConnectionSummary[];
}
```

### 7.3 IntegrationErrorResponse

```ts
{
  error: {
    code: string;
    message: string;
  };
}
```

**Recommended error codes:**

| Code | Meaning |
|------|---------|
| INTEGRATION_NOT_FOUND | Connection doesn't exist |
| INTEGRATION_FORBIDDEN | User doesn't own this connection |
| INTEGRATION_PROVIDER_MISMATCH | Connection is for wrong provider |
| INTEGRATION_NEEDS_REAUTH | Token expired or revoked |
| INTEGRATION_REFRESH_FAILED | Token refresh failed |
| INTEGRATION_INVALID_STATE | OAuth state is invalid |
| INTEGRATION_OAUTH_EXCHANGE_FAILED | Code exchange with provider failed |
| INTEGRATION_PROVIDER_ERROR | Provider returned an error |

### 7.4 GoogleCalendarOption

```ts
{
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string | null;
}
```

This DTO exists to support the documented phase-2 resource selection flow for authenticated widget settings.

### 7.5 GoogleCalendarListResponse

```ts
{
  items: GoogleCalendarOption[];
}
```

---

## 8. Endpoint contracts

### 8.1 GET /integrations

**Purpose:** List the current user's integration connections.

**Auth:** JWT required.

**Query params:**
```ts
{
  provider?: string;
  status?: string;
}
```

**Validation:**
- `provider`, if supplied, must be a supported provider key
- `status`, if supplied, must be one of the supported connection states

**Success response:**
```
HTTP 200 OK

{
  items: IntegrationConnectionSummary[];
}
```

**Error response:**
```
HTTP 401 Unauthorized
// unauthenticated request
```

**Notes:** This endpoint is used by the settings UI connection picker, which the authenticated integration pattern explicitly requires as phase 1.

---

### 8.2 GET /integrations/:integrationConnectionId

**Purpose:** Return a single safe connection summary.

**Auth:** JWT required.

**Path params:**
```ts
{
  integrationConnectionId: string; // UUID
}
```

**Validation:**
- must be a valid UUID
- connection must exist
- connection must belong to the authenticated user

**Success response:**
```
HTTP 200 OK

IntegrationConnectionSummary
```

**Error responses:**
```
HTTP 404 Not Found
// connection does not exist

HTTP 403 Forbidden
// connection belongs to another user
```

---

### 8.3 PATCH /integrations/:integrationConnectionId

**Purpose:** Update user-editable connection metadata.

**Auth:** JWT required.

**Path params:**
```ts
{
  integrationConnectionId: string; // UUID
}
```

**Request body:**
```ts
{
  accountLabel?: string | null;
}
```

**Allowed fields:** `accountLabel`

**Disallowed fields:**
- `provider`
- `userId`
- `externalAccountId`
- `scopes`
- token fields
- raw metadata replacement (unless explicitly supported later)

**Success response:**
```
HTTP 200 OK

IntegrationConnectionSummary
```

**Error responses:**
```
HTTP 400 Bad Request
// invalid label

HTTP 404 Not Found
// connection not found

HTTP 403 Forbidden
// ownership violation
```

---

### 8.4 DELETE /integrations/:integrationConnectionId

**Purpose:** Disconnect a provider account.

**Auth:** JWT required.

**Path params:**
```ts
{
  integrationConnectionId: string; // UUID
}
```

**Behavior:**
1. verify ownership
2. mark connection unusable immediately
3. remove or invalidate local tokens
4. widgets referencing this connection must later resolve into a safe missing-connection or invalid-connection widget error state

The missing-connection and invalid-connection behaviors are explicitly required by the integration pattern.

**Success response:**
```
HTTP 204 No Content
```

**Error responses:**
```
HTTP 404 Not Found
// connection not found

HTTP 403 Forbidden
// ownership violation
```

**Note:** Soft delete vs hard delete is not specified in the uploaded docs. Recommended V1 behavior is soft delete or status transition to preserve diagnostics.

---

### 8.5 POST /integrations/:integrationConnectionId/refresh

**Purpose:** Manually validate and refresh a connection.

**Auth:** JWT required.

**Path params:**
```ts
{
  integrationConnectionId: string; // UUID
}
```

**Behavior:**
1. verify ownership
2. load connection
3. validate provider compatibility
4. call adapter `validateConnection`
5. call adapter `refreshConnectionIfNeeded`
6. persist updated expiry/token metadata
7. return updated safe summary

This behavior is directly aligned with the documented provider adapter contract.

**Success response:**
```
HTTP 200 OK

IntegrationConnectionSummary
```

**Error responses:**
```
HTTP 404 Not Found
// connection not found

HTTP 403 Forbidden
// ownership violation

HTTP 409 Conflict
// connection requires re-authentication

HTTP 502 Bad Gateway
// provider refresh failed
```

---

### 8.6 GET /integrations/google/start

**Purpose:** Start Google OAuth for a signed-in Ambient Screen user.

**Auth:** JWT required.

**Query params:**
```ts
{
  returnTo?: string;
}
```

**Behavior:**
1. verify authenticated user
2. generate signed short-lived OAuth state
3. bind state to user identity
4. redirect user to Google consent screen

**Success response:**
```
HTTP 302 Found
// Redirects to Google OAuth authorize URL
```

**Alternative (for native/mobile flows):**
```
HTTP 200 OK

{
  authorizationUrl: string;
}
```

**Error responses:**
```
HTTP 401 Unauthorized
// not signed in

HTTP 429 Too Many Requests
// rate limited
```

**Security notes:** State must include at least:
- authenticated user id
- provider key
- nonce
- expiry
- return target

The platform security model confirms auth and sensitive command/install paths use rate limiting; Google OAuth start should follow the same principle.

---

### 8.7 GET /integrations/google/callback

**Purpose:** Finish Google OAuth, exchange code for tokens, and create or update an IntegrationConnection.

**Auth:** No bearer JWT required on callback itself. Trust is established by verifying the OAuth state.

**Query params:**
```ts
{
  code?: string;
  state?: string;
  error?: string;
}
```

**Behavior:**
1. verify signed state and expiry
2. resolve Ambient Screen user identity from state
3. if provider returned error, stop and redirect with failure
4. exchange auth code for tokens
5. fetch Google account identity
6. upsert `integration_connections` row
7. redirect user back to the app integrations screen

**Success response:**
```
HTTP 302 Found
// Redirect target example:
// /admin/integrations?provider=google&status=success
```

**Failure response:**
```
HTTP 302 Found
// Redirect target example:
// /admin/integrations?provider=google&status=error&code=oauth_failed
```

**Persistence rules:** The created or updated connection must store:
- `provider = "google"`
- `external_account_id`
- encrypted access token
- encrypted refresh token (if provided)
- `token_expires_at`
- `scopes_json`
- provider-safe metadata such as email or display label

This is aligned to the canonical `integration_connections` schema and the integration pattern.

---

### 8.8 GET /integrations/google/calendars

**Purpose:** List the calendars available through a selected Google connection.

**Auth:** JWT required.

**Query params:**
```ts
{
  integrationConnectionId: string; // UUID (required)
}
```

**Validation:**
- required UUID format
- connection must exist
- connection must belong to authenticated user
- connection provider must be google

**Behavior:**
1. load connection
2. validate ownership and provider compatibility
3. validate connection
4. refresh token if needed
5. call Google Calendar list endpoint
6. normalize response into calendar options

This endpoint directly supports the documented phase-2 resource selection flow for authenticated widget settings.

**Success response:**
```
HTTP 200 OK

{
  items: GoogleCalendarOption[];
}
```

**Error responses:**
```
HTTP 400 Bad Request
// missing or invalid connection id

HTTP 403 Forbidden
// ownership violation

HTTP 404 Not Found
// connection not found

HTTP 409 Conflict
// connection needs re-auth

HTTP 502 Bad Gateway
// provider error
```

---

## 9. Express route signatures

These are the suggested backend signatures for the current Express API structure.

### 9.1 integrations.routes.ts

```ts
router.get("/integrations", requireJwt, integrationsController.listConnections)
router.get("/integrations/:integrationConnectionId", requireJwt, integrationsController.getConnection)
router.patch("/integrations/:integrationConnectionId", requireJwt, integrationsController.updateConnection)
router.delete("/integrations/:integrationConnectionId", requireJwt, integrationsController.deleteConnection)
router.post("/integrations/:integrationConnectionId/refresh", requireJwt, integrationsController.refreshConnection)
```

### 9.2 google-oauth.routes.ts

```ts
router.get("/integrations/google/start", requireJwt, googleOAuthController.start)
router.get("/integrations/google/callback", googleOAuthController.callback)
router.get("/integrations/google/calendars", requireJwt, googleIntegrationsController.listCalendars)
```

This route split keeps generic connection lifecycle separate from provider-specific OAuth/resource flows while still fitting the existing route-module pattern.

---

## 10. Service contract

### 10.1 IntegrationsService

**Methods:**
```ts
listConnections(userId, filters)
getConnectionById(userId, connectionId)
updateConnectionLabel(userId, connectionId, input)
deleteConnection(userId, connectionId)
refreshConnection(userId, connectionId)
```

**Responsibilities:**
- enforce ownership
- return safe DTOs
- never expose token material
- delegate provider-specific operations to provider services/adapters

These responsibilities follow from the integration security rules and the current service/repository backend structure.

### 10.2 GoogleOAuthService

**Methods:**
```ts
buildAuthorizationUrl(userId, returnTo?)
handleCallback(query)
exchangeCodeForTokens(code)
fetchGoogleIdentity(accessToken)
upsertGoogleConnection(userId, identity, tokenSet)
```

**Responsibilities:**
- own OAuth state generation and validation
- exchange code for tokens
- fetch account identity
- create or update `integration_connections`

### 10.3 GoogleCalendarAdapter

**Methods:**
```ts
validateConnection(connection)
refreshConnectionIfNeeded(connection)
fetch(input)
normalize(raw, input)
getCacheKey(input)
getTtlSeconds(input)
```

This matches the documented OAuth-capable provider adapter contract.

---

## 11. Repository contract

### 11.1 IntegrationsRepository

**Methods:**
```ts
listByUser(userId, filters)
findById(connectionId)
findByUserAndId(userId, connectionId)
findByUserProviderAndExternalAccount(userId, provider, externalAccountId)
create(input)
update(connectionId, patch)
markDeletedOrRevoked(connectionId)
touchLastSynced(connectionId, at)
```

### 11.2 Data mapping rules

Repository returns persistence models. Service maps them into safe DTOs. Token fields are never passed beyond the provider-aware service/adapter boundary unless strictly required for refresh or provider calls.

This boundary is implied by the integration docs, which require plugin resolvers and clients to stay scoped away from direct token handling.

---

## 12. Request validation contract

### 12.1 UUID validation

The following inputs must validate as UUIDs:
- `integrationConnectionId`

### 12.2 Patch validation

`PATCH /integrations/:integrationConnectionId` accepts only:

**Request body:**
```ts
{
  accountLabel: string | null;
}
```

**Constraints:**
- max length recommended: 120 characters
- trim whitespace
- empty string normalizes to null

The exact length limit is a design recommendation; I cannot confirm an existing repo-wide string policy from the uploaded docs.

### 12.3 Query validation

`GET /integrations/google/calendars` requires:
- `integrationConnectionId`

`GET /integrations` optional filters:
- `provider`
- `status`

---

## 13. Error behavior contract

### 13.1 Safe error messages

Client-visible messages must be short and non-technical.

**Examples:**
- `Connection not found.`
- `This connection needs to be reconnected.`
- `Unable to load calendars.`
- `Access to this account was denied.`

This aligns with the broader plugin/UI guidance that user-facing widget and integration messages should stay safe and plain-language.

### 13.2 Connection state transitions

**Recommended transitions:**

| From | To | Trigger |
|------|----|---------|
| connected | needs_reauth | Token expired or revoked |
| connected | error | Transient provider issue |
| connected | revoked | User disconnected account |
| needs_reauth | connected | Successful re-auth |

These transitions are design recommendations built on top of the canonical `status` field.

---

## 14. Frontend consumption contract

### 14.1 Connection picker

The plugin settings UI must first call:

```
GET /integrations?provider=google
```

and render a connection picker.

### 14.2 Calendar picker

After the user selects a connection, the settings UI must call:

```
GET /integrations/google/calendars?integrationConnectionId=...
```

and render a calendar picker.

This matches the documented two-phase settings UI pattern for authenticated integrations.

---

## 15. Widget resolver dependency contract

### 15.1 Config shape

The Google Calendar widget resolver must receive config shaped like:

```ts
{
  provider: "google";
  integrationConnectionId: string;
  calendarIds?: string[];         // provider-specific multi-resource selection
  maxItems?: number;              // display parameter
}
```

That pattern is explicitly documented for authenticated widgets.

### 15.2 Resolver flow

The resolver flow must remain:

1. load widget instance
2. read widget config
3. load integration connection by id
4. validate ownership and provider compatibility
5. validate connection
6. refresh token if needed
7. fetch provider data
8. normalize into widget envelope

That flow is explicitly documented and should not be bypassed.

---

## 16. Suggested file layout

### 16.1 Core integrations module

```
apps/api/src/modules/integrations/
├── integrations.routes.ts
├── integrations.controller.ts
├── integrations.service.ts
├── integrations.repository.ts
├── integrations.types.ts
├── integrations.schemas.ts
└── integration-connection.mapper.ts
```

### 16.2 Google-specific module

```
apps/api/src/modules/integrations/providers/google/
├── google-oauth.routes.ts
├── google-oauth.controller.ts
├── google-oauth.service.ts
├── google-calendar.adapter.ts
├── google.client.ts
└── google.schemas.ts
```

This respects the current backend's domain route groups and route/service/repository layering.

---

## 17. Minimum V1 acceptance criteria

1. A signed-in user can start Google OAuth.
2. Callback creates or updates an `integration_connections` row.
3. User can list their Google connections safely.
4. User can disconnect a Google connection.
5. User can list calendars for a selected Google connection.
6. No token material is ever returned to the client.
7. Widget settings can complete connection selection then calendar selection.
8. Calendar widget resolver can use `integrationConnectionId` without owning auth state.

These criteria are directly derived from the integration pattern and the calendar widget specifications.
