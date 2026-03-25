
Google OAuth + IntegrationConnection API Contract

Status: Canonical implementation contract
Audience: backend and frontend implementers
Last updated: 2026-03-25


---

1. Purpose

Define the backend API contract for Google OAuth and IntegrationConnection management used by authenticated plugins, starting with the Google Calendar widget.

This contract exists to ensure that:

third-party OAuth lives in the integration layer, not in plugin code

widget config references a connection instead of storing secrets

the backend owns token validation, refresh, provider requests, and normalization

the client only consumes safe, normalized responses


This follows the authenticated integration pattern and the current backend route/module architecture.  


---

2. Architectural Position

2.1 Route group

All endpoints in this contract live under:

/integrations

This fits the existing REST route-module approach in the API, where route groups are organized by domain and implemented with routes -> service -> repository. 


---

2.2 Responsibility boundaries

The integration layer is responsible for:

creating and storing provider connections

exchanging OAuth codes for tokens

refreshing tokens

validating provider access

exposing safe connection summaries

exposing provider resource pickers such as Google calendars


Plugins are responsible for:

storing provider and integrationConnectionId in widget config

validating plugin-specific config

asking the API resolver for normalized widget data


Plugins must not own tokens or OAuth flows. 


---

3. Data model contract

3.1 Backing table

The canonical V1 blueprint defines an integration_connections table with these core fields:

id

user_id

provider

status

account_label

external_account_id

scopes_json

access_token_encrypted

refresh_token_encrypted

token_expires_at

metadata_json

last_synced_at

created_at

updated_at


and a uniqueness constraint on (user_id, provider, external_account_id). 


---

3.2 Google connection rules

For Google Calendar V1:

provider must be google

one user may have multiple Google connections in the future

reconnecting the same Google account should update the existing (user_id, provider, external_account_id) record instead of creating duplicates


This upsert behavior is consistent with the table shape and uniqueness rule in the architecture blueprint. 


---

3.3 Recommended status values

Use these connection statuses:

connected

needs_reauth

revoked

error


Note: the blueprint confirms the table has a status field, but does not prescribe these exact four values. These values are a design recommendation layered on top of the canonical table shape. The canonical doc currently only proves that status exists. 


---

4. Security contract

4.1 Authentication

All /integrations endpoints are JWT-protected except the OAuth callback, which is validated through signed OAuth state. This is consistent with the platform security model where HTTP routes are JWT-protected except explicit public auth/health routes. 


---

4.2 Ownership

For any endpoint that reads or mutates an integration connection, the backend must enforce:

connection.userId === authenticatedUser.id

This is explicitly required by the authenticated integration pattern. 


---

4.3 Token handling

The backend must enforce all of the following:

tokens are stored only in the integration connection layer

tokens are never returned to the client

tokens are never stored in widget config

plugins never implement provider auth directly


These rules are explicit in the authenticated integration guide. 


---

4.4 Provider compatibility

Before using a connection for Google resources, the backend must verify that the selected connection belongs to the Google provider. Provider compatibility validation is explicitly part of the documented resolver flow. 


---

5. OAuth scope contract

5.1 V1 scope

Use the minimum scope required for the read-only calendar widget:

https://www.googleapis.com/auth/calendar.readonly

I cannot confirm this scope from the uploaded repo docs, so treat it as a design recommendation for V1.


---

6. Endpoint overview

V1 includes these endpoints:

1. GET /integrations


2. GET /integrations/:integrationConnectionId


3. PATCH /integrations/:integrationConnectionId


4. DELETE /integrations/:integrationConnectionId


5. POST /integrations/:integrationConnectionId/refresh


6. GET /integrations/google/start


7. GET /integrations/google/callback


8. GET /integrations/google/calendars



This endpoint set supports the documented two-phase settings flow: connection selection first, then provider-specific resource selection such as calendars. 


---

7. Shared DTOs

7.1 IntegrationConnectionSummary

Response-safe DTO returned to clients.

Fields:

id: string

provider: "google"

status: "connected" | "needs_reauth" | "revoked" | "error"

accountLabel: string | null

accountEmail: string | null

externalAccountId: string | null

scopes: string[]

lastSyncedAt: string | null

createdAt: string

updatedAt: string


Rules:

must never include access token

must never include refresh token

must never include raw provider token response

may include non-sensitive metadata derived from metadata_json


This DTO shape is derived from the canonical integration_connections fields and the documented rule that clients receive safe normalized data only.  


---

7.2 IntegrationConnectionListResponse

Fields:

items: IntegrationConnectionSummary[]



---

7.3 IntegrationErrorResponse

Fields:

error: { code: string, message: string }


Recommended error codes:

INTEGRATION_NOT_FOUND

INTEGRATION_FORBIDDEN

INTEGRATION_PROVIDER_MISMATCH

INTEGRATION_NEEDS_REAUTH

INTEGRATION_REFRESH_FAILED

INTEGRATION_INVALID_STATE

INTEGRATION_OAUTH_EXCHANGE_FAILED

INTEGRATION_PROVIDER_ERROR


These codes are recommended based on the documented error classes: invalid connection, missing connection, provider failure, and access denied. 


---

7.4 GoogleCalendarOption

Fields:

id: string

summary: string

primary: boolean

accessRole: string | null


This DTO exists to support the documented phase-2 resource selection flow for authenticated plugin settings. 


---

7.5 GoogleCalendarListResponse

Fields:

items: GoogleCalendarOption[]



---

8. Endpoint contracts

8.1 GET /integrations

Purpose

List the current user’s integration connections.

Auth

JWT required. 

Query params

provider?: string

status?: string


Validation

provider, if supplied, must be a supported provider key

status, if supplied, must be one of the supported connection states


Success response

HTTP 200 OK

Body:

items: IntegrationConnectionSummary[]


Error response

HTTP 401 Unauthorized

unauthenticated request


Notes

This endpoint is used by the settings UI connection picker, which the authenticated integration pattern explicitly requires as phase 1. 


---

8.2 GET /integrations/:integrationConnectionId

Purpose

Return a single safe connection summary.

Auth

JWT required. 

Path params

integrationConnectionId: string


Validation

must be a valid UUID

connection must exist

connection must belong to the authenticated user


Success response

HTTP 200 OK

Body:

IntegrationConnectionSummary


Error responses

HTTP 404 Not Found

connection does not exist


HTTP 403 Forbidden

connection belongs to another user



---

8.3 PATCH /integrations/:integrationConnectionId

Purpose

Update user-editable connection metadata.

Auth

JWT required. 

Path params

integrationConnectionId: string


Request body

Allowed fields:

accountLabel?: string | null


Disallowed fields:

provider

userId

externalAccountId

scopes

token fields

raw metadata replacement unless explicitly supported later


Success response

HTTP 200 OK

Body:

IntegrationConnectionSummary


Error responses

HTTP 400 Bad Request

invalid label


HTTP 404 Not Found

connection not found


HTTP 403 Forbidden

ownership violation



---

8.4 DELETE /integrations/:integrationConnectionId

Purpose

Disconnect a provider account.

Auth

JWT required. 

Path params

integrationConnectionId: string


Behavior

verify ownership

mark connection unusable immediately

remove or invalidate local tokens

widgets referencing this connection must later resolve into a safe missing-connection or invalid-connection widget error state


The missing-connection and invalid-connection behaviors are explicitly required by the integration pattern. 

Success response

HTTP 204 No Content

Error responses

HTTP 404 Not Found

connection not found


HTTP 403 Forbidden

ownership violation


Note

Soft delete vs hard delete is not specified in the uploaded docs. I cannot confirm which one your current codebase prefers. Recommended V1 behavior is soft delete or status transition to preserve diagnostics.


---

8.5 POST /integrations/:integrationConnectionId/refresh

Purpose

Manually validate and refresh a connection.

Auth

JWT required. 

Path params

integrationConnectionId: string


Behavior

verify ownership

load connection

validate provider compatibility

call adapter validateConnection

call adapter refreshConnectionIfNeeded

persist updated expiry/token metadata

return updated safe summary


This behavior is directly aligned with the documented provider adapter contract. 

Success response

HTTP 200 OK

Body:

IntegrationConnectionSummary


Error responses

HTTP 404 Not Found

connection not found


HTTP 403 Forbidden

ownership violation


HTTP 409 Conflict

connection requires re-authentication


HTTP 502 Bad Gateway

provider refresh failed



---

8.6 GET /integrations/google/start

Purpose

Start Google OAuth for a signed-in Ambient Screen user.

Auth

JWT required. 

Query params

returnTo?: string


Behavior

verify authenticated user

generate signed short-lived OAuth state

bind state to user identity

redirect user to Google consent screen


Success response

HTTP 302 Found

Redirects to Google OAuth authorize URL

Alternative

For native/mobile flows, an implementation may return 200 OK with:

authorizationUrl: string


I cannot confirm whether your current client prefers redirect-based web flow, deep-link flow, or a hybrid. This is a product/client implementation choice.

Error responses

HTTP 401 Unauthorized

not signed in


HTTP 429 Too Many Requests

rate limited


Security notes

State must include at least:

authenticated user id

provider key

nonce

expiry

return target


The platform security model confirms auth and sensitive command/install paths use rate limiting; Google OAuth start should follow the same principle. 


---

8.7 GET /integrations/google/callback

Purpose

Finish Google OAuth, exchange code for tokens, and create or update an IntegrationConnection.

Auth

No bearer JWT required on callback itself. Trust is established by verifying the OAuth state.

Query params

code?: string

state?: string

error?: string


Behavior

verify signed state and expiry

resolve Ambient Screen user identity from state

if provider returned error, stop and redirect with failure

exchange auth code for tokens

fetch Google account identity

upsert integration_connections row

redirect user back to the app integrations screen


Success response

HTTP 302 Found

Redirect target example:

/admin/integrations?provider=google&status=success

Failure response

HTTP 302 Found

Redirect target example:

/admin/integrations?provider=google&status=error&code=oauth_failed

Persistence rules

The created or updated connection must store:

provider = "google"

external_account_id

encrypted access token

encrypted refresh token if provided

token_expires_at

scopes_json

provider-safe metadata such as email or display label


This is aligned to the canonical integration_connections schema and the integration pattern.  


---

8.8 GET /integrations/google/calendars

Purpose

List the calendars available through a selected Google connection.

Auth

JWT required. 

Query params

integrationConnectionId: string


Validation

required UUID

connection must exist

connection must belong to authenticated user

connection provider must be google


Behavior

load connection

validate ownership and provider compatibility

validate connection

refresh token if needed

call Google Calendar list endpoint

normalize response into calendar options


This endpoint directly supports the documented phase-2 resource selection flow for authenticated widget settings. 

Success response

HTTP 200 OK

Body:

items: GoogleCalendarOption[]


Error responses

HTTP 400 Bad Request

missing or invalid connection id


HTTP 403 Forbidden

ownership violation


HTTP 404 Not Found

connection not found


HTTP 409 Conflict

connection needs re-auth


HTTP 502 Bad Gateway

provider error



---

9. Express route signatures

These are the suggested backend signatures for the current Express API structure.

9.1 integrations.routes.ts

router.get("/integrations", requireJwt, integrationsController.listConnections)

router.get("/integrations/:integrationConnectionId", requireJwt, integrationsController.getConnection)

router.patch("/integrations/:integrationConnectionId", requireJwt, integrationsController.updateConnection)

router.delete("/integrations/:integrationConnectionId", requireJwt, integrationsController.deleteConnection)

router.post("/integrations/:integrationConnectionId/refresh", requireJwt, integrationsController.refreshConnection)


9.2 google-oauth.routes.ts

router.get("/integrations/google/start", requireJwt, googleOAuthController.start)

router.get("/integrations/google/callback", googleOAuthController.callback)

router.get("/integrations/google/calendars", requireJwt, googleIntegrationsController.listCalendars)


This route split keeps generic connection lifecycle separate from provider-specific OAuth/resource flows while still fitting the existing route-module pattern. 


---

10. Service contract

10.1 IntegrationsService

Methods:

listConnections(userId, filters)

getConnectionById(userId, connectionId)

updateConnectionLabel(userId, connectionId, input)

deleteConnection(userId, connectionId)

refreshConnection(userId, connectionId)


Responsibilities:

enforce ownership

return safe DTOs

never expose token material

delegate provider-specific operations to provider services/adapters


These responsibilities follow from the integration security rules and the current service/repository backend structure.  


---

10.2 GoogleOAuthService

Methods:

buildAuthorizationUrl(userId, returnTo?)

handleCallback(query)

exchangeCodeForTokens(code)

fetchGoogleIdentity(accessToken)

upsertGoogleConnection(userId, identity, tokenSet)


Responsibilities:

own OAuth state generation and validation

exchange code for tokens

fetch account identity

create or update integration_connections



---

10.3 GoogleCalendarAdapter

Methods:

validateConnection(connection)

refreshConnectionIfNeeded(connection)

fetch(input)

normalize(raw, input)

getCacheKey(input)

getTtlSeconds(input)


This matches the documented OAuth-capable provider adapter contract. 


---

11. Repository contract

11.1 IntegrationsRepository

Methods:

listByUser(userId, filters)

findById(connectionId)

findByUserAndId(userId, connectionId)

findByUserProviderAndExternalAccount(userId, provider, externalAccountId)

create(input)

update(connectionId, patch)

markDeletedOrRevoked(connectionId)

touchLastSynced(connectionId, at)


11.2 Data mapping rules

Repository returns persistence models. Service maps them into safe DTOs. Token fields are never passed beyond the provider-aware service/adapter boundary unless strictly required for refresh or provider calls.

This boundary is implied by the integration docs, which require plugin resolvers and clients to stay scoped away from direct token handling. 


---

12. Request validation contract

12.1 UUID validation

The following inputs must validate as UUIDs:

integrationConnectionId


12.2 Patch validation

PATCH /integrations/:integrationConnectionId accepts only:

accountLabel: string | null


Constraints:

max length recommended: 120

trim whitespace

empty string normalizes to null


The exact length limit is a design recommendation; I cannot confirm an existing repo-wide string policy from the uploaded docs.

12.3 Query validation

GET /integrations/google/calendars requires:

integrationConnectionId


GET /integrations optional filters:

provider

status



---

13. Error behavior contract

13.1 Safe error messages

Client-visible messages must be short and non-technical.

Examples:

Connection not found.

This connection needs to be reconnected.

Unable to load calendars.

Access to this account was denied.


This aligns with the broader plugin/UI guidance that user-facing widget and integration messages should stay safe and plain-language. 

13.2 Connection state transitions

Recommended transitions:

connected -> needs_reauth when refresh fails or tokens are revoked

connected -> error for transient provider issues

connected -> revoked when user disconnects

needs_reauth -> connected after successful re-auth


These transitions are design recommendations built on top of the canonical status field.


---

14. Frontend consumption contract

14.1 Connection picker

The plugin settings UI must first call:

GET /integrations?provider=google

and render a connection picker.

14.2 Calendar picker

After the user selects a connection, the settings UI must call:

GET /integrations/google/calendars?integrationConnectionId=...

and render a calendar picker.

This matches the documented two-phase settings UI pattern for authenticated integrations. 


---

15. Widget resolver dependency contract

The Google Calendar widget resolver must receive config shaped like:

provider

integrationConnectionId

provider-specific selection fields such as calendarIds

display-specific parameters such as maxItems


That pattern is explicitly documented for authenticated widgets. 

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

16. Suggested file layout

Under apps/api/src/modules/integrations/:

integrations.routes.ts

integrations.controller.ts

integrations.service.ts

integrations.repository.ts

integrations.types.ts

integrations.schemas.ts

integration-connection.mapper.ts


Under apps/api/src/modules/integrations/providers/google/:

google-oauth.routes.ts

google-oauth.controller.ts

google-oauth.service.ts

google-calendar.adapter.ts

google.client.ts

google.schemas.ts


This respects the current backend’s domain route groups and route/service/repository layering. 


---

17. Minimum V1 acceptance criteria

1. A signed-in user can start Google OAuth.


2. Callback creates or updates an integration_connections row.


3. User can list their Google connections safely.


4. User can disconnect a Google connection.


5. User can list calendars for a selected Google connection.


6. No token material is ever returned to the client.


7. Widget settings can complete connection selection then calendar selection.


8. Calendar widget resolver can use integrationConnectionId without owning auth state.



These criteria are directly derived from the integration pattern and the calendar
