

Integration Platform (Canonical)

Status: Source of truth
Last updated: 2026-03-24


---

1. Purpose

Define a standardized, secure, and scalable way to integrate third-party services into the platform.

This document ensures:

no ad-hoc integrations per plugin

consistent authentication handling

reusable provider logic

strict security boundaries



---

2. Core Concept

All third-party integrations are handled by the platform, not by plugins.

Plugins do not talk directly to external services.

Instead, integrations flow through:

1. IntegrationConnection (user-level connection)


2. Provider Adapter (platform-level integration logic)




---

3. Architecture Overview

The integration platform has three core layers:

Connection Layer → stores and manages user accounts

Adapter Layer → communicates with external providers

Resolver Integration → used by plugins via runtime



---

4. IntegrationConnection Model

Represents a user-linked external account.

Each connection belongs to a user and a provider.


---

4.1 Required Fields

id

userId

provider

externalAccountId



---

4.2 Authentication Fields

encryptedAccessToken

encryptedRefreshToken

tokenType

scopes



---

4.3 Lifecycle Fields

expiresAt

createdAt

updatedAt



---

4.4 Metadata Fields

label (user-defined name, e.g. "Work Google")

metadata (provider-specific structured data)



---

5. Provider Adapter Layer

Each provider must be implemented once as a reusable adapter.

Adapters are owned by the platform, not by plugins.


---

5.1 Responsibilities

validate connection

refresh tokens

fetch external data

normalize responses

define caching behavior



---

5.2 Required Methods

Each adapter must implement:

providerKey

requiresConnection

validateConnection(connection)

refreshConnectionIfNeeded(connection)

fetch(input)

normalize(raw, input)



---

5.3 Optional Methods

getCacheKey(input)

getTtlSeconds(input)



---

5.4 Design Rules

adapters are stateless

adapters never expose tokens

adapters return normalized data only



---

6. Integration Flow

6.1 Connection Creation

1. User selects provider


2. Platform initiates OAuth flow


3. Provider returns authorization code


4. Backend exchanges code for tokens


5. Tokens are encrypted and stored


6. IntegrationConnection is created




---

6.2 Data Fetch Flow

1. Plugin resolver receives config


2. Extracts integrationConnectionId


3. Loads IntegrationConnection


4. Validates ownership


5. Calls provider adapter



Adapter performs:

token refresh if needed

external API call

normalization


6. Resolver returns normalized data




---

7. Security Model

7.1 Token Storage

tokens are encrypted at rest

tokens are never returned to client

tokens are never exposed to plugin logic



---

7.2 Access Control

users can only access their own connections

every request validates ownership

server enforces provider isolation



---

7.3 Client Restrictions

client never calls provider APIs for authenticated data

client only consumes normalized backend responses



---

8. Caching Strategy

Adapters may define caching behavior.


---

8.1 Cache Key

Derived from:

provider

connection id

request parameters



---

8.2 TTL

Defined per adapter based on:

provider rate limits

data volatility



---

8.3 Cache Scope

user-scoped

provider-scoped

never shared across users



---

9. Error Handling

All adapter errors must be normalized.


---

9.1 Standard Error Types

AUTH_ERROR → invalid or expired credentials

PERMISSION_ERROR → insufficient scopes

RATE_LIMIT → provider throttling

NOT_FOUND → resource not found

UNKNOWN → fallback



---

9.2 Resolver Behavior

must never throw raw provider errors

must return normalized error in data envelope



---

10. Plugin Integration Contract

Plugins interact with integrations only via:

integrationConnectionId

provider key


Plugins must:

never access tokens

never implement OAuth

never call provider APIs directly



---

11. Configuration Pattern

All authenticated plugins must include:

provider

integrationConnectionId


Optional:

resource identifiers (e.g. calendarId, repoId)

display options



---

12. Supported Integration Types

12.1 OAuth-Based Providers

Examples:

Google

Microsoft

GitHub


Handled via token lifecycle and refresh flow.


---

12.2 API Key Providers

stored securely in backend

treated as connection with limited scope



---

12.3 Public APIs

no connection required

adapter may bypass auth logic



---

13. Connection Management

13.1 User Capabilities

Users must be able to:

create connection

rename connection

delete connection

re-authenticate connection



---

13.2 Platform Responsibilities

handle token refresh automatically

detect expired connections

surface connection status



---

14. Anti-Patterns (Must Avoid)

plugin-level OAuth flows

storing tokens in plugin config

exposing tokens to frontend

duplicating provider logic across plugins

calling providers directly from client



---

15. Future Extensions

15.1 Multi-Account Support

multiple connections per provider per user



---

15.2 Background Sync

periodic refresh of provider data

pre-fetch for performance



---

15.3 Webhooks

provider-driven updates

reduce polling



---

15.4 Unified Permission Model

standardized scope mapping across providers



---

16. Summary

This integration platform ensures:

secure handling of third-party credentials

reusable provider logic

consistent plugin integration model

elimination of ad-hoc integrations



---

✅ What you now have (important)

With the two docs:

1. plugin-platform-architecture.md


2. integration-platform.md



You now have:

clear separation of concerns

a reusable integration model

a scalable foundation for marketplace + SDK


