# Ambient Screen — M4 Milestones (Status)

## M4.1 Authentication & User Accounts

Status: Done

## M4.2 Cloud Profiles & Sync

Status: Done

## M4.3 Device Registration & Management

Status: Done

## M4.4 Remote Control (Core)

Status: Done

Delivered:
- websocket-authenticated realtime channel
- device-scoped subscriptions
- `POST /devices/:id/command`
- command model: `SET_PROFILE`, `REFRESH`, `SET_SLIDESHOW`
- controller UI (Remote Control screen)
- display command listener behavior

## M4.5 Widget Plugin System (Core)

Status: Done

Delivered:
- widget plugin registry (`widgetPluginRegistry.ts`)
- plugin manifest contract and SDK docs
- client-side plugin renderer integration
- starter plugin template (M4.5.1)

## M4.6 Permissions (Basic Ownership)

Status: Done

Delivered:
- ownership validation helpers across all major routes
- cross-user access hardening (profiles, widgets, devices, sessions)

## M4.7 API Hardening & Public Readiness

Status: Done

Delivered:
- request ID middleware (`requestIdMiddleware`)
- structured request logging middleware
- `/health` (liveness) and `/health/ready` (readiness) endpoints
- global error middleware with consistent error envelope

## M4.8 Foundation for Monetization

Status: Done

Delivered:
- entitlements module (`/entitlements`)
- plan-based feature flag checks
- premium widget/plugin gating hooks
- billing module scaffold
