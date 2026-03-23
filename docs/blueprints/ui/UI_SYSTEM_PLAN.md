> Status: Non-canonical
> Type: Blueprint
> Authority: Not the primary source of truth when a canonical doc exists

# Ambient Screen — UI System Plan (V1 → V2 Evolution)

## Purpose

This document defines the visual system, interaction model, and implementation strategy for Ambient Screen UI.

Goals:
- create a calm, premium, glanceable dashboard experience
- make widget composition intuitive and enjoyable
- ensure consistency across mobile and web
- reduce UI fragmentation as the product scales
- introduce icons, motion, and layout in a controlled way

---

## Core UX Philosophy

Ambient Screen is:

- glance-first (not read-heavy)
- calm (low cognitive load)
- structured (predictable layout)
- composable (widgets feel modular)
- delightful but subtle (motion supports, not distracts)

---

## Product Modes (CRITICAL)

UI must support 3 distinct modes:

### Display Mode
- passive viewing
- minimal chrome
- high readability
- clean surfaces
- optimized for distance

### Edit Mode
- active interaction
- visible grid
- drag/resize affordances
- selection states
- contextual controls

### Management Mode (Marketplace / Settings)
- list-heavy
- form-driven
- structured navigation
- consistent cards and lists

These modes must NOT share identical UI behavior.

---

## Design System Foundations

### Spacing Scale

- xs: 4
- sm: 8
- md: 12
- lg: 16
- xl: 24
- xxl: 32

Used for:
- widget padding
- layout gutters
- spacing between elements

---

### Radius System

- small: 8
- medium: 12
- large: 16–20

Widgets use medium/large  
Buttons use small/medium

---

### Elevation / Borders

Display Mode:
- minimal elevation
- subtle borders or shadows

Edit Mode:
- stronger contrast
- visible boundaries

---

### Typography

Rules:
- large primary values (time, temperature)
- medium titles
- small metadata

Avoid:
- dense text blocks
- long descriptions

---

## Icon System

### Library

Use Lucide React Native

---

### Rules

- one icon system across entire app
- icons replace unnecessary text
- consistent stroke width
- limited color usage

Do NOT:
- mix icon libraries
- mix styles (filled vs outline randomly)

---

### Sizes

- sm: 16–20
- md: 24
- lg: 32
- xl: 48–64

---

### Icon Wrapper (MANDATORY)

Create a shared AppIcon component to enforce:
- size consistency
- color tokens
- theming
- future replaceability

---

### Special Widgets

Weather / expressive widgets may:
- use richer visuals
- but must remain visually consistent

---

## Widget System

### Structure

Each widget must include:

- container (surface)
- header (icon + title)
- body (main content)
- optional footer

---

### Widget Surface

Standardize:
- padding
- radius
- elevation/border
- spacing

---

### States

Widgets must support:

- loading
- error
- empty
- locked (premium)
- editing (selected)

---

### Density

Display Mode:
- low density
- more whitespace

Edit Mode:
- higher clarity
- visible boundaries

---

## Layout System

### Grid

- 12 columns (tablet/web)
- 4–6 columns (mobile)

Includes:
- gutters
- snapping

---

### Edit Mode Grid

Visible:
- alignment guides
- snap feedback

Hidden in Display Mode

---

### Widget Behavior

- draggable
- resizable
- snap to grid
- collision handling

---

## Motion System

### Principles

- motion explains state changes
- fast and subtle
- no unnecessary loops

---

### Core Animations

- fade in/out
- scale on selection
- snap feedback
- dashboard transitions

---

### Libraries

- react-native-reanimated
- react-native-gesture-handler

---

## Library Stack

Core:
- react-native-reanimated
- react-native-gesture-handler
- react-native-safe-area-context

UI System:
- Restyle (preferred) OR Tamagui

Interaction:
- @gorhom/bottom-sheet

Lists:
- FlashList

Icons:
- Lucide React Native

---

## Implementation Strategy

### Phase 1 — Audit

- inventory widgets
- detect inconsistencies
- review icon usage
- analyze layout issues

---

### Phase 2 — Design Tokens

- spacing
- radius
- colors
- icons
- motion

---

### Phase 3 — Core Components

- WidgetSurface
- WidgetHeader
- EmptyState
- ErrorState
- LoadingState
- AppIcon
- BottomSheet patterns

---

### Phase 4 — Edit Mode

- grid overlay
- selection states
- drag/resize
- contextual menus

---

### Phase 5 — Display Mode

- reduce chrome
- improve readability
- refine spacing
- transitions

---

### Phase 6 — Marketplace

- FlashList
- consistent cards
- filters/search

---

### Phase 7 — Widget Migration

Order:
1. Clock
2. Weather
3. Calendar
4. Data widgets

---

## Acceptance Criteria

- widgets readable in <2 seconds
- consistent layout across screens
- intuitive edit mode
- icons reduce text usage
- smooth animations
- no layout breaks
- safe areas respected

---

## Constraints

DO NOT:
- restyle widgets individually
- mix icon systems
- break spacing rules
- introduce heavy animations
- bypass design tokens

---

## Outcome

- consistent UI system
- scalable widget architecture
- intuitive dashboard editing
- premium UX
