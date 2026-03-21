# Ambient Screen — M4 Milestones

---

## M4.1 — Authentication & User Accounts

### Goal
Introduce user identity and secure access.

### Scope
- user model (email, password or OAuth)
- login / logout
- token-based authentication (JWT or similar)
- protect API routes

---

## M4.2 — Cloud Profiles & Sync

### Goal
Make dashboards available across devices.

### Scope
- profiles linked to authenticated user
- fetch profiles on login
- sync widgets/layout/config from backend
- remove local-only dependency

---

## M4.3 — Device Registration & Management

### Goal
Track and manage devices per user.

### Scope
- device model (id, name, lastSeenAt)
- register device on app start
- list devices in UI
- basic device metadata

---

## M4.4 — Remote Control (Core)

### Goal
Control a display from another device.

### Scope
- select target device/session
- change active profile remotely
- toggle slideshow mode
- trigger refresh
- use realtime layer

---

## M4.5 — Widget Plugin System (Core)

### Goal
Enable extensibility.

### Scope
- define widget interface contract
- decouple widget registry from core code
- allow dynamic registration
- enforce schema validation

---

## M4.6 — Permissions (Basic Ownership)

### Goal
Ensure data isolation.

### Scope
- users own profiles, widgets, sessions
- validate ownership in API
- prevent cross-user access

---

## M4.7 — API Hardening & Public Readiness

### Goal
Prepare platform for external usage.

### Scope
- consistent API structure
- error handling standardization
- rate limiting (basic)
- documentation readiness

---

## M4.8 — Foundation for Monetization

### Goal
Prepare for premium features.

### Scope
- feature flags (basic)
- mark widgets as premium-ready
- prepare billing integration points (no full billing yet)

---

## Deliverables for M4

- authentication system
- cloud-synced dashboards
- device management
- remote control capability
- plugin-ready widget system
- secure API layer

---