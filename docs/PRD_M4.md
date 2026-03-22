# Ambient Screen PRD — M4 (Current)

M4 goal: transition from local single-screen utility to authenticated multi-device platform.

## M4 Scope

- authentication + JWT sessions
- cloud profiles
- device registration/management
- shared sessions + slideshow orchestration
- realtime synchronization
- remote control between devices (M4.4)

## Delivered in Code

- M4.1 Authentication: implemented
- M4.2 Cloud Profiles: implemented
- M4.3 Device Registration/Management: implemented
- M4.4 Remote Control (Core): implemented

## M4.4 Requirements (Implemented)

- controller can select target device
- controller can send command:
  - `SET_PROFILE`
  - `REFRESH`
  - `SET_SLIDESHOW`
- target display receives command in realtime via websocket
- server enforces device ownership before command delivery
- offline target is rejected gracefully

## Technical Constraints

- ownership checks are server-enforced, never client-trusted
- websocket logic is decoupled from UI components
- command model remains intentionally small and extensible

## Remaining M4 Areas (Planned)

- plugin/widget ecosystem hardening
- broader permission model evolution
- public API hardening / external readiness
- monetization foundation milestones
