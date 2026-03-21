# Ambient Screen – V2 Product Requirements Document

## 1. Overview

V2 introduces a multi-widget display system that allows multiple widgets to be rendered simultaneously on a screen using a grid-based layout.

This evolves the product from a single-widget experience (V1) into a configurable ambient dashboard.

---

## 2. Goal

Enable users to:

1. Display multiple widgets at the same time
2. Control where each widget appears on screen
3. Maintain smooth, real-time updates per widget
4. Keep system extensible for future widgets

---

## 3. Non-Goals

V2 will NOT include:

1. Drag & drop layout editor
2. User authentication
3. Multi-user/device sync
4. Advanced animations/transitions
5. Cloud sync

---

## 4. Core Features

### 4.1 Grid Layout System

A screen is divided into a grid.

Each widget has:

- x (column position)
- y (row position)
- w (width in grid units)
- h (height in grid units)

---

### 4.2 Multi-Widget Rendering

System supports:

- multiple active widgets
- independent refresh cycles
- parallel rendering

---

### 4.3 Layout API

New API:

GET /layout

Returns:

- list of widget instances
- layout positions
- widget configs

---

### 4.4 Widget Engine Upgrade

Each widget:

- resolves data independently
- renders independently
- does NOT block others

---

### 4.5 Admin Configuration (basic)

User can:

- create widget
- assign layout position
- activate/deactivate widget

---

## 5. Functional Requirements

### Layout

1. Grid must be deterministic
2. Widgets must not overlap (initially enforced server-side)
3. Layout must be stable across refresh

---

### Rendering

1. Display must render all widgets
2. Each widget updates independently
3. No global refresh blocking

---

### API

1. Layout endpoint returns full display state
2. Widget data endpoint remains unchanged
3. System must remain backward-compatible where possible

---

## 6. Data Model Changes

### V1

position: number

### V2

layout:
  x: number
  y: number
  w: number
  h: number

---

## 7. Success Metrics

1. Multiple widgets visible simultaneously
2. No rendering conflicts
3. Stable refresh cycles
4. No regression from V1

---

## 8. Risks

1. Layout collisions
2. Rendering performance issues
3. Complex state handling
4. Over-engineering layout system

---

## 9. Future Extensions (V3)

1. Drag & drop editor
2. Responsive layouts
3. Widget transitions
4. AI-driven layout orchestration