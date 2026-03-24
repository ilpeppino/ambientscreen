> Status: Canonical
> Purpose: Source of truth for current implementation and planned evolution
> Audience: Humans and agentic AI
> Last reviewed: 2026-03-23

# Product Roadmap

## Current Baseline (Shipped in Repository)
- Authenticated API with JWT (`/auth/register`, `/auth/login`, `/auth/logout`).
- Profile + widget + display layout flows.
- Device lifecycle + remote command transport over websocket.
- Shared sessions + orchestration rules.
- Plugin marketplace foundation:
  - approved catalog endpoints
  - user install/uninstall/enable
  - developer publishing APIs
  - admin moderation APIs
- Plan/entitlement feature gating (`free` vs `pro`) and client entitlement context.
- **Slide foundation** — multi-slide composition model:
  - `Slide` and `SlideItem` data models with per-slide ordering, duration, and enable/disable
  - Full slide CRUD API (`/slides`)
  - `SlideRail` editor component for in-editor slide management (create, rename, delete, duration)
  - `useSlidePlayback` display hook for timed slide rotation based on per-slide `durationSeconds`
  - Single-slide profiles work transparently without any rotation

## Near-Term Priorities
1. Billing integration on top of existing hooks.
- Implement real webhook endpoint and signature verification.
- Bind billing events to durable plan updates.

2. Marketplace/runtime consistency hardening.
- Confirm and document runtime behavior for non-builtin plugin delivery.
- Add stricter compatibility validation between plugin manifests/config and widget runtime handling.

3. Quality hardening.
- Expand integration tests for critical API flows (auth, plugin installation, moderation, device commands).
- Keep client token/modal checks and web smoke build as release gates.

## Mid-Term Priorities
1. Realtime scale path.
- Replace in-memory realtime fan-out with shared pub/sub for horizontal scaling.

2. Client architecture hardening.
- Reduce `AdminHomeScreen` orchestration complexity and continue shared UI primitive adoption.
- Evaluate migration from mode-flag navigation to a dedicated navigation library.

3. Entitlement model maturity.
- Move from plan-only flags to provider-backed entitlement lifecycle if monetization requires finer access control.

## Long-Term Direction
1. Production plugin ecosystem.
- Stronger trust, compatibility, and lifecycle policies for third-party plugins.

2. Advanced multi-device orchestration.
- Richer scheduling and synchronized playback behavior across many displays.

## Notes on Certainty
- Items tied to explicit TODOs and placeholder modules in code are high-confidence roadmap candidates.
- Business sequencing beyond these items remains subject to product confirmation.
