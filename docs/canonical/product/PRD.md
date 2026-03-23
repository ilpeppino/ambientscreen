> Status: Canonical
> Purpose: Source of truth for current implementation
> Audience: Humans and agentic AI
> Last reviewed: 2026-03-23

# Product Requirements Document (Current)

## Product Summary
Ambient Screen is a multi-device display platform with an authenticated backend, a cross-platform Expo client (web + mobile), real-time sync, and a moderated plugin marketplace foundation.

## Goals
- Provide authenticated per-user display management across web/mobile clients.
- Allow users to manage profiles, widgets, devices, shared sessions, and display orchestration.
- Support real-time remote commands to active devices.
- Support plugin discovery/installation/publishing/moderation with entitlement gates.

## Non-Goals (Current)
- Production billing provider integration (Stripe/App Store/Play) is not implemented.
- Multi-node realtime fan-out is not implemented (current server is in-memory single process).
- Navigation framework migration is not implemented (client uses app-mode state + deep link/history helpers).

## Core Functional Scope (Implemented)

### Authentication and User Session
- Email/password register and login via JWT.
- Logout endpoint with token blocklisting.
- Authenticated routes enforced server-side.

### Profile and Display Management
- Multi-profile CRUD with active profile switching.
- Widget CRUD, layout updates, config patching, and delete.
- Display layout read API for current/explicit profile.
- Built-in widget keys: `clockDate`, `weather`, `calendar`.

### Device and Remote Control
- Device register + heartbeat lifecycle.
- Device list/rename/delete.
- Remote commands to owned online devices:
  - `SET_PROFILE`
  - `REFRESH`
  - `SET_SLIDESHOW`

### Shared Sessions and Orchestration
- Shared session list/create/read/update + participant join/leave.
- Shared-session slideshow state (interval, rotation IDs, index).
- Orchestration rules (`interval`, `rotation`) with validation.
- Realtime channels for profile/session/device updates.

### Plugin Ecosystem Foundation
- Authenticated plugin catalog for approved plugins (`/plugins`).
- Per-user plugin installation and enable/disable (`/plugins/:pluginId/install`, `/me/plugins`).
- Developer plugin publishing flow (`/developer/plugins`).
- Admin moderation flow for plugins and versions (`/admin/plugins`) plus admin plugin metadata/version management under `/plugins`.

### Entitlements and Plan Gating
- User plan model (`free`/`pro`) and feature map endpoint (`/entitlements`).
- Feature-gated actions enforced server-side (for example plugin installation and premium widget usage).
- Billing hook module exists as placeholder only.

## Success Criteria (Operational)
- Authenticated user can complete profile/widget/device lifecycle without cross-user access.
- Display clients receive remote commands in realtime when online.
- Shared session and orchestration updates are persisted and retrievable.
- Approved plugins can be listed and user installations are persisted.
- Entitlements endpoint reflects user plan and feature access map used by client gating.

## Explicit Boundaries
- Canonical behavior is defined by current code in `apps/api`, `apps/client`, and `packages/shared-contracts`.
- Historical milestone PRDs are retained only as non-canonical reference.
