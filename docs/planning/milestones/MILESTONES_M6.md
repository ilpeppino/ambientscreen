> Status: Non-canonical
> Type: Planning
> Authority: Not the primary source of truth when a canonical doc exists

# Ambient Screen — M6 Milestones: Monetization & Entitlements

---

## 🎯 Phase Overview

M6 introduces monetization capabilities through:

- entitlement system
- premium plugin support
- payment readiness
- marketplace monetization UX

---

## 🧱 M6.1 — Entitlement System (Core)

### Goal

Create the core entitlement infrastructure.

### Scope

- Entitlement model (DB)
- CRUD operations
- entitlement validation service

### Deliverables

- Entitlement table
- API endpoints
- validation logic

---

## 🧱 M6.2 — Premium Plugin Support

### Goal

Enable premium plugin definition and enforcement.

### Scope

- add isPremium to plugin
- enforce entitlement in:
  - install
  - enable
  - widget creation

### Deliverables

- premium flag
- enforcement logic
- API validation updates

---

## 🧱 M6.3 — Marketplace Monetization UX

### Goal

Expose monetization in UI.

### Scope

- premium badge
- locked plugin UI
- upgrade messaging

### Deliverables

- marketplace updates
- plugin detail updates

---

## 🧱 M6.4 — Entitlement Management API

### Goal

Allow granting/revoking entitlements.

### Scope

- admin endpoints
- internal entitlement assignment

### Deliverables

- admin entitlement APIs
- test coverage

---

## 🧱 M6.5 — Payment Provider Abstraction

### Goal

Prepare system for payments.

### Scope

- payment provider interface
- Stripe adapter (stub)
- Apple/Google placeholders

### Deliverables

- provider abstraction layer
- mock implementation

---

## 🧱 M6.6 — Purchase Flow (Basic)

### Goal

Enable simulated purchase flow.

### Scope

- purchase endpoint (mock)
- entitlement creation after purchase

### Deliverables

- purchase API
- entitlement linking

---

## 🧱 M6.7 — Subscription Support (Foundation)

### Goal

Prepare subscription model.

### Scope

- recurring entitlement support
- expiration logic

### Deliverables

- subscription-ready entitlement system

---

## 🧱 M6.8 — Access Control Hardening

### Goal

Ensure security and correctness.

### Scope

- enforce checks everywhere
- audit flows

### Deliverables

- consistent entitlement validation
- test coverage

---

## 🧱 M6.9 — Analytics Hooks (Optional)

### Goal

Track monetization metrics.

### Scope

- plugin installs
- purchases
- usage

---

## 🧱 M6.10 — Documentation

### Goal

Document monetization system.

### Scope

- entitlement system
- premium plugin flow
- developer monetization guide

---

## ✅ Exit Criteria

M6 is complete when:

- premium plugins enforced
- entitlement system fully working
- marketplace reflects monetization
- system ready for real payments
