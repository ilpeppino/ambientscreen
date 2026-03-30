# Device Capability (Canonical)

Status: Draft v1  
Purpose: Source of truth for device-originated data and actions used by widgets  
Audience: Humans and agentic AI  
Last reviewed: 2026-03-30

---

## 1. Purpose

Define a standardized, secure, and scalable way for widgets to consume device-originated data.

This document ensures:

- no ad-hoc device access inside widgets
- consistent handling of device permissions and privacy
- reusable platform-level device logic
- normalized device data flowing through the existing plugin runtime
- compatibility with future device-aware widgets and automations

This capability complements:

- plugin-platform-architecture.md
- plugin-sdk.md
- integration-platform.md
- render-architecture.md

Core question:

How can a widget safely show data that originates from the physical device running the app?

---

## 2. Core Principle

Device-originated data must be handled by the platform, not by individual widgets.

Widgets do not talk directly to native device APIs.

Instead, device data flows through:

1. Device Agent Layer (client)
2. Device State Layer (backend)
3. Device Adapter Layer (backend)
4. Plugin Runtime Layer (shared)

---

## 3. Relationship to Existing Architecture

This capability extends the current architecture without changing its core rules:

- backend remains the source of truth for runtime widget data
- client renderers remain presentation-only
- widgets still resolve through the shared plugin runtime
- device data is normalized before reaching renderers
- widgets still use the shared data envelope contract

This capability is conceptually parallel to the Integration Platform, but for local device state.

---

## 4. Capability Types

Add a new capability category:

- deviceData

Optional future extension:

- deviceControl

Definitions:

- deviceData: read-only access to normalized device state
- deviceControl: command-based interaction with device (future scope)

This document focuses on deviceData.

---

## 5. Architecture Overview

Client App (Expo)
→ Device Agent  
→ reads native APIs  
→ normalizes data  
→ sends snapshot  

Backend API
→ Device State storage  
→ Device Adapters  
→ Widget resolvers  

Client Renderer
→ receives widget envelope only  

---

## 6. Device Agent Layer

Purpose:

A platform-owned client-side layer that reads device state via native APIs.

Responsibilities:

- request permissions
- read raw device values
- normalize into snapshot payloads
- publish updates to backend
- abstract platform differences

Rules:

- widgets must not call native APIs
- widgets must not manage permissions
- widgets must not subscribe to device state directly
- all data must flow through the Device Agent

---

## 7. Device State Model

A device snapshot represents the latest known state of a device.

Example structure:

DeviceSnapshot:
- deviceId
- capturedAt
- platform

Optional groups:

battery:
- levelPercent
- state
- lowPowerMode

network:
- isConnected
- type
- ipAddress
- isAirplaneModeEnabled

localization:
- locale
- region
- calendars
- uses24HourClock

deviceInfo:
- modelName
- manufacturer
- osName
- osVersion
- deviceYearClass
- totalMemoryBytes

notifications:
- appBadgeCount
- pendingNotificationCount
- lastReceivedAt

appState:
- isForeground
- lastSeenAt
- appVersion
- buildVersion

permissions:
- battery
- contacts
- calendar
- location
- notifications

extras:
- free-form extension object

Rules:

- all fields are optional
- missing data is not an error
- timestamps must be ISO strings
- values must be normalized

---

## 8. Device Adapter Layer

Purpose:

Provide a reusable backend interface for accessing device data.

Contract:

DeviceAdapter:
- adapterKey
- fetch(input)
- normalize(snapshot, input)
- optional cache key
- optional TTL

Responsibilities:

- retrieve latest snapshot
- normalize output for widgets
- enforce device ownership
- abstract storage

Rules:

- adapters are platform-owned
- widgets cannot query storage directly
- adapters return normalized data only
- no sensitive data leakage

---

## 9. Plugin Runtime Integration

Device widgets follow the standard plugin contract:

- manifest
- config schema
- default config
- resolver
- renderer

Resolver rules:

- validate config
- determine target device
- call Device Adapter
- return normalized data
- never throw

Renderer rules:

- pure function
- no native calls
- consume normalized data only
- follow render architecture

---

## 10. Device Widget Categories

Safe categories:

- battery
- connectivity
- locale/time
- app state
- sensors
- app notifications
- device identity

Restricted categories:

- call history
- SMS/message inbox
- system-wide notifications from other apps
- special entitlement data

Restricted categories must not be assumed available.

---

## 11. Permission Model

Permissions are managed by the platform, not widgets.

Rules:

- widgets do not request permissions
- permissions are handled by Device Agent
- denied permissions result in missing data
- renderer must degrade gracefully

Permission states:

- granted
- denied
- not_required
- unknown

---

## 12. Snapshot Update Strategy

Trigger types:

- app launch
- foreground event
- periodic heartbeat
- manual refresh
- native event listeners
- push triggers (future)

Freshness classes:

- realtime: battery, network
- periodic: device info, localization
- event-based: permissions, notifications

Rules:

- different fields have different refresh rates
- avoid excessive polling
- preserve freshness metadata

---

## 13. Data Envelope Semantics

ready:
- sufficient data available

empty:
- no snapshot
- no device selected
- no usable data

stale:
- snapshot outdated but usable

error:
- invalid config or ownership failure

---

## 14. Inspector Pattern

Device widgets use shared inspector components.

Section order:

1. Device
2. Source / Metric
3. Display

Examples:

Device:
- target device
- current device toggle

Source:
- metric type
- refresh mode

Display:
- labels
- icons
- formatting

Rules:

- use shared components
- provide displayValue for all fields
- hide internal IDs

---

## 15. Rendering Rules

Battery widget:
- hero: percentage
- support: charging state
- detail: last updated

Connectivity widget:
- hero: connection type
- support: network state
- detail: metadata

Notification widget:
- hero: count
- support: source
- detail: timestamp

Rules:

- prioritize primary value
- degrade detail first
- no scrolling
- no overlap

---

## 16. Security and Privacy

Rules:

- no direct native access from widgets
- no sensitive data in config
- enforce ownership
- minimize data exposure

Data minimization:

- prefer counts over raw data
- prefer summaries over logs
- prefer timestamps over history

Restricted data must be:

- explicitly classified
- permission-gated
- opt-in
- policy-reviewed

---

## 17. Anti-Patterns

- widgets calling native APIs
- permission prompts in widgets
- raw device logs in UI
- platform branching in renderers
- sensitive config storage
- assuming restricted data availability

---

## 18. Initial Built-In Widgets

- batteryStatus
- deviceConnectivity
- deviceInfo
- appNotifications
- deviceLocale

---

## 19. Future Extensions

Device Control:

- brightness
- volume
- orientation
- remote actions

Multi-device dashboards:

- display data from other devices

Orchestration:

- trigger flows from device conditions

---

## 20. Summary

The Device Capability enables widgets to safely consume device-originated data while preserving the platform architecture.

Key guarantees:

- backend-driven data flow
- pure renderers
- normalized adapters
- strict privacy boundaries
- reusable infrastructure

This is the foundation for all device-aware widgets.