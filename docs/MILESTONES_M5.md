# Ambient Screen — M5 Milestones

---

## M5.1 — Plugin Registry Service (Backend)

Status: Done

### Goal
Create centralized plugin registry.

### Scope
- plugin metadata storage
- plugin listing API
- plugin lookup by key/version
- plugin approval status

---

## M5.2 — Plugin Installation System

Status: Done

### Goal
Allow users to install plugins.

### Scope
- install/uninstall plugin
- user-plugin relationship
- enable/disable plugin
- installed plugins API

---

## M5.3 — Marketplace UI (Client)

Status: Done

### Goal
Expose plugins to users.

### Scope
- plugin browsing UI
- plugin detail page
- install/uninstall actions
- filtering/search

---

## M5.4 — Plugin Publishing (Developer Flow)

Status: Done

### Goal
Enable developers to publish plugins.

### Scope
- plugin submission API
- metadata validation
- version upload
- approval workflow (basic/manual)

---

## M5.5 — Plugin Moderation & Admin

Status: Done

### Goal
Manage plugin lifecycle and moderation.

### Scope
- admin moderation routes (`/admin/plugins`)
- approve/reject plugin versions
- moderation status tracking (`ModerationStatus` enum)
- publisher visibility controls

---

## M5.6 — Plugin Security & Validation

Status: Planned

### Goal
Ensure safe ecosystem.

### Scope
- schema validation
- plugin signature/checksum (basic)
- approval flags
- restricted capabilities

---

## M5.7 — Monetization (Plugin-Level)

Status: Planned

### Goal
Enable plugin monetization.

### Scope
- mark plugins as premium/paid
- enforce access via entitlements
- prepare revenue model (no full billing yet)

---

## M5.8 — Developer Portal (Docs + Publishing UX)

Status: Partially Done (docs shipped in M4.5.1)

### Goal
Support external developers.

### Scope
- plugin docs site
- publishing guide
- example plugins
- submission guidelines

---

## Deliverables for M5

- plugin marketplace backend
- plugin installation system
- marketplace UI
- publishing workflow
- plugin lifecycle management
- ecosystem-ready platform
