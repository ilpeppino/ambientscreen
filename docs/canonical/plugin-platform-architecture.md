# Plugin Platform Architecture (Canonical)

**Status:** Source of truth
**Last updated:** 2026-03-24

---

## 1. Purpose

Define a modular, scalable, and secure plugin architecture that:
- enables integration with third-party applications
- avoids ad-hoc per-integration implementations
- supports a marketplace model
- allows external developers to build plugins via SDK

---

## 2. System Overview

The plugin platform is composed of **three independent planes**:

1. **Runtime Plane** → executes plugins/widgets
2. **Marketplace Plane** → governs distribution & lifecycle
3. **Integration Plane** → manages third-party connections

These planes are intentionally decoupled.

---

## 3. Current Implementation Status

### 3.1 Implemented

**Plugin database models:**
- Plugin
- PluginVersion
- InstalledPlugin
- ModerationEvent

**API surface:**
- `/plugins`
- `/me/plugins`
- `/developer/plugins`
- `/admin/plugins`

**Runtime:**
- in-memory plugin registry (API + client)
- widget rendering via `WidgetKey`
- shared plugin contract (config + data envelope)

### 3.2 Partially Implemented

- Plugin marketplace (metadata + workflows exist, UX incomplete)
- Plugin SDK (defined but not fully enforced as canonical contract)
- Integration pattern (documented but not fully implemented platform-wide)

### 3.3 Not Implemented (Important)

- ❌ Dynamic third-party plugin code execution
- ❌ Remote plugin loading at runtime
- ❌ Sandboxed execution environment for external plugins

**Current system executes built-in plugins only.**

---

## 4. Architectural Principles

### 4.1 Separation of Concerns

| Concern | Plane |
|---------|-------|
| Execution | Runtime Plane |
| Distribution | Marketplace Plane |
| External APIs | Integration Plane |

### 4.2 No Ad-Hoc Integrations

All third-party integrations MUST go through:
- IntegrationConnection model
- Provider Adapter layer

Plugins MUST NOT:
- store tokens themselves
- implement custom OAuth flows
- call providers directly from client

### 4.3 Backend as Source of Truth

- All external data is fetched via backend
- Client only renders normalized data
- No direct provider calls from frontend (for authenticated data)

### 4.4 Contract-Driven Design

All plugins must conform to:
- manifest contract
- config schema
- data envelope format

Breaking changes require **major version bump**.

---

## 5. Runtime Plane

### 5.1 Responsibilities

- validate plugin config
- execute plugin resolver
- return normalized widget data
- render widget in client

### 5.2 Core Components

#### Plugin Manifest

Defines:
- id
- version
- widget type
- capabilities

#### Config Schema

- JSON schema defining allowed config
- validated at runtime

#### Resolver (API)

```ts
resolve(ctx) => PluginResult
```

Responsibilities:
- fetch data (via adapters if needed)
- transform into normalized format

#### Renderer (Client)

```ts
render(props) => UI
```

Responsibilities:
- render UI
- no external API calls

#### Data Envelope

```ts
{
  status: "ok" | "error" | "loading",
  data: any,
  error?: string,
  meta?: Record<string, any>
}
```

---

## 6. Marketplace Plane

### 6.1 Responsibilities

- plugin publishing
- version management
- moderation
- installation
- enable/disable lifecycle

### 6.2 Core Models

- Plugin
- PluginVersion
- InstalledPlugin
- ModerationEvent

### 6.3 Lifecycle

1. Developer creates plugin
2. Submits version
3. Platform reviews
4. Approved → available in marketplace
5. User installs plugin
6. Plugin enabled in runtime

### 6.4 Important Constraint

**Marketplace ≠ Execution**

Approval does NOT imply:
- dynamic code execution
- remote code loading

---

## 7. Integration Plane

### 7.1 Purpose

Standardize all third-party integrations.

### 7.2 IntegrationConnection Model

Represents a user-linked external account.

Fields:
- id
- userId
- provider
- externalAccountId
- scopes
- encryptedTokens
- expiresAt
- metadata

### 7.3 Provider Adapter Contract

Each provider implements:

```ts
interface ProviderAdapter {
  providerKey: string
  requiresConnection: boolean
  validateConnection(connection)
  refreshConnectionIfNeeded(connection)
  fetch(input)
  normalize(raw, input)
  getCacheKey?(input)
  getTtlSeconds?(input)
}
```

### 7.4 Key Rules

- plugins DO NOT access tokens
- plugins DO NOT implement OAuth
- adapters are the ONLY provider interface

### 7.5 Data Flow

1. Plugin resolver receives config
2. Reads integrationConnectionId
3. Calls provider adapter
4. Adapter:
   - refreshes token if needed
   - fetches provider data
   - normalizes response
5. Resolver returns normalized data

---

## 8. Plugin Types

### 8.1 Static Plugins

- no external data
- purely visual

### 8.2 Public Data Plugins

- call public APIs
- no authentication required

### 8.3 Authenticated Plugins

- require IntegrationConnection
- use provider adapters

---

## 9. Plugin SDK (Contract)

Every plugin must define:
- manifest
- config schema
- default config
- resolver
- renderer

Optional:
- settings UI
- preview renderer

---

## 10. Security Model

### 10.1 Token Safety

- tokens stored encrypted in backend
- never exposed to client
- never exposed to plugin code

### 10.2 Ownership Enforcement

- user can only access own connections
- server validates access on every request

### 10.3 Execution Constraints

- no arbitrary code execution (current state)
- all logic runs inside controlled backend/client

---

## 11. Versioning

Plugin versions follow semver.

Breaking changes (require MAJOR version):
- config schema
- manifest
- data envelope

---

## 12. Future Architecture (Planned)

### 12.1 Sandboxed Plugin Execution

- isolated runtime (e.g. WASM / container)
- safe execution of external plugins

### 12.2 Remote Plugin Distribution

- plugin packages fetched dynamically
- verified and sandboxed

### 12.3 Capability System

Planned plugin capabilities:
- publicData
- authenticatedData
- deviceControl
- premiumFeatures

### 12.4 Advanced Marketplace

- paid plugins
- subscriptions
- analytics
- ratings

---

## 13. Anti-Patterns (Must Avoid)

❌ Plugin-specific OAuth implementations
❌ Tokens stored in plugin config
❌ Direct API calls from frontend
❌ Custom integration logic per plugin
❌ Mixing marketplace logic with runtime execution

---

## 14. Summary

This architecture ensures:
- modular integration with third-party apps
- no duplication of integration logic
- strong separation of concerns
- future extensibility toward full marketplace ecosystem
