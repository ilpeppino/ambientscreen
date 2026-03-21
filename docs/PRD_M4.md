# Ambient Screen — Product Requirements Document (PRD)
# Version: M4 — Platformization & Ecosystem

---

## 1. Overview

M4 represents the transition of Ambient Screen from a configurable dashboard system into a scalable platform.

By the end of M4, the system will support:

- multi-user authentication
- cloud-synced profiles and sessions
- remote control of displays
- extensibility through plugins/widgets
- readiness for monetization

---

## 2. Goals

### Primary Goals

1. Enable users to access their dashboards across devices (cloud-based)
2. Introduce remote control capabilities
3. Enable extensibility through a widget/plugin system
4. Prepare the platform for monetization

---

### Secondary Goals

- Improve security and identity management
- Enable device-level management
- Provide API-first extensibility

---

## 3. Non-Goals

- Full marketplace (initially limited registry)
- Complex enterprise RBAC (basic roles only)
- Offline-first synchronization (basic fallback only)

---

## 4. Key Features

---

### 4.1 Authentication & Identity

- user accounts (email / OAuth optional)
- login/logout flows
- session persistence

---

### 4.2 Cloud Profiles

- profiles stored in backend
- accessible across devices
- sync on login

---

### 4.3 Device Registration

- each device has a unique ID
- devices linked to user account
- devices can be named and managed

---

### 4.4 Remote Control

- control one display from another device
- change profile remotely
- control slideshow mode
- trigger refresh

---

### 4.5 Widget Plugin System

- standardized widget interface
- dynamic widget registration
- separation between core and external widgets

---

### 4.6 Permissions (Basic)

- user owns profiles and sessions
- devices belong to user
- shared sessions remain supported

---

### 4.7 API-first Design

- all features accessible via API
- prepare for external integrations

---

## 5. Architecture Principles

- API remains source of truth
- client remains rendering + runtime
- DB stores persistent configuration only
- real-time layer handles sync
- plugin system must not break core

---

## 6. Success Metrics

- users can login and see same dashboards across devices
- remote control works reliably
- system supports adding new widgets without core changes
- multi-device sync remains stable

---

## 7. Risks

- complexity of sync and ownership
- plugin system stability
- authentication security

---

## 8. Future Extensions

- marketplace
- premium widgets
- enterprise features (RBAC, teams)
- analytics

---