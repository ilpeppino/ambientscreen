# Ambient Screen — PRD M6: Monetization & Entitlements

## 📌 Overview

M6 introduces monetization capabilities into Ambient Screen by enabling:

- premium plugins
- user entitlements (access control)
- subscription-ready infrastructure
- future payment provider integrations

This phase does NOT fully implement payments yet, but establishes the full foundation required for monetization.

---

## 🎯 Goals

1. Enable plugin monetization (premium plugins)
2. Introduce entitlement system for access control
3. Allow future subscription and purchase models
4. Keep system extensible for multiple payment providers
5. Ensure no disruption to existing free plugin flows

---

## 🧠 Core Concepts

### 1. Free vs Premium Plugins

- Free plugins → accessible to all users
- Premium plugins → require entitlement

---

### 2. Entitlement

An entitlement represents access granted to a user.

Examples:

- access to a premium plugin
- access via subscription
- access via one-time purchase

---

### 3. Separation of Concerns

- Plugin → defines monetization type
- Entitlement → defines user access
- Payment Provider → grants entitlement (future)

---

## 🧱 Functional Requirements

---

### FR1 — Premium Plugin Flag

Plugins must support:

- isPremium: boolean

Behavior:

- free plugin → always installable
- premium plugin → install requires entitlement

---

### FR2 — Entitlement System

System must support:

- userId
- pluginId OR entitlementType
- validFrom
- validUntil (optional)
- status (ACTIVE, EXPIRED, REVOKED)

---

### FR3 — Access Control

Before allowing:

- plugin install
- plugin enable
- widget creation

System must verify:

- plugin is free OR
- user has active entitlement

---

### FR4 — Marketplace Integration

Marketplace must:

- show premium badge
- indicate locked state
- allow install only if entitled

---

### FR5 — Developer Support

Developers must:

- mark plugin as premium
- define pricing metadata (basic placeholder)

---

### FR6 — Future Payment Readiness

System must support:

- Stripe
- Apple In-App Purchase
- Google Play Billing

(Implementation in later milestones)

---

## 🧱 Non-Functional Requirements

---

### NFR1 — Backward Compatibility

- existing free plugins must continue working unchanged

---

### NFR2 — Security

- entitlement checks must be server-side enforced
- client must not bypass access control

---

### NFR3 — Extensibility

- must support:
  - subscriptions
  - bundles
  - time-limited access

---

### NFR4 — Performance

- entitlement checks must be lightweight
- avoid blocking UI unnecessarily

---

## 📦 Data Model Overview

---

### Plugin

- isPremium (boolean)

---

### Entitlement

- id
- userId
- pluginId (optional)
- type (PLUGIN, SUBSCRIPTION, etc.)
- status (ACTIVE, EXPIRED, REVOKED)
- validFrom
- validUntil

---

## 🔄 User Flows

---

### Free Plugin Flow

1. user browses marketplace
2. installs plugin
3. uses plugin

---

### Premium Plugin Flow (Future-ready)

1. user sees premium plugin
2. user tries to install
3. system checks entitlement
4. if no entitlement → blocked / upgrade prompt
5. if entitlement → install allowed

---

## 🚫 Out of Scope (for M6 initial phase)

- payment processing UI
- billing provider integration
- refunds
- invoices

---

## ✅ Success Criteria

- premium plugins visible in marketplace
- entitlement system exists and is enforced
- users cannot use premium plugins without access
- system ready for payment integration

---

## 🚀 Outcome

M6 establishes the monetization foundation required to turn Ambient Screen into a revenue-generating platform.
