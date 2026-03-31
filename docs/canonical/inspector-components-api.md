# docs/canonical/inspector-components-api.md

## Shared Inspector Components API (Canonical)

Status: Source of truth
Last updated: 2026-03-27

---

## 1. Purpose

Define a shared, consistent, and scalable API for rendering and managing the widget inspector UI across all widgets.

The inspector must:

- avoid ad-hoc per-widget UI implementations  
- present configuration in a clean, human-readable way  
- support both read-only and edit modes  
- support integration-based widgets (OAuth + external resources)  
- align with plugin architecture and shared UI system  

---

## 2. Design Principles

### 2.1 Declarative, Not Ad-Hoc

Widgets must declare their inspector structure using a definition (sections + fields), not arbitrary UI.

---

### 2.2 Separation of Responsibilities

- Shared system handles layout, spacing, typography, and behavior  
- Widgets provide configuration schema + mapping only  

---

### 2.3 Human-Readable UI

Inspector must:

- never expose raw schema keys directly  
- never expose internal IDs in normal UI  
- always prefer user-friendly labels and values  

---

### 2.4 No Layout in Inspector

Layout (position, size) is owned by SlideItem and must not be shown in read-only inspector.

---

### 2.5 Integration-First Pattern

All authenticated integrations must follow:

1. Connection selection  
2. Resource selection  
3. Display configuration  

---

### 2.6 Consistency Across Widgets

All widgets must:

- use the same section structure  
- use the same field components  
- follow the same interaction patterns  

---

## 3. Inspector Modes

Two modes are supported:

- readOnly  
- edit  

InspectorMode = "readOnly" | "edit"

---

## 4. Core Architecture

The inspector system is composed of three layers:

### 4.1 Layout Layer

Responsible for:

- panel structure  
- header  
- section layout  
- spacing and alignment  

---

### 4.2 Field Layer

Responsible for:

- rendering fields  
- handling input controls  
- formatting values  

---

### 4.3 Widget Mapping Layer

Responsible for:

- defining sections  
- mapping config to display values  
- controlling visibility and editability  

---

## 5. Inspector Definition API

Each widget must provide a function:

getInspectorDefinition(config, context)

This returns a structured definition used by the shared renderer.

---

## 6. Types

### 6.1 InspectorDefinition

Fields:

- sections: InspectorSectionDefinition[]

---

### 6.2 InspectorSectionDefinition

Fields:

- id: string  
- title: string  
- description?: string  
- fields: InspectorFieldDefinition[]  
- actions?: InspectorAction[]  
- isVisible?: boolean  

---

### 6.3 InspectorFieldDefinition

Fields:

- id: string  
- label: string  
- kind: FieldKind  
- value: unknown  
- displayValue?: string  
- editable: boolean  
- multiline?: boolean  
- options?: Option[]  
- helperText?: string
- onChange?: function
- onConnect?: function — `connectionPicker` only; called when the user initiates a new OAuth connection. OAuth logic must live outside the widget.
- isVisible?: boolean
- isDisabled?: boolean

---

### 6.4 FieldKind

Allowed values:

- text
- boolean
- segmented
- select
- optionList
- connectionPicker
- resourcePicker
- custom

#### Field kind selection guide

| Kind | Interaction | Use when |
|------|-------------|----------|
| `segmented` | Horizontal segment row | 2–5 short options that fit side-by-side; quick toggling (e.g. provider, time window) |
| `boolean` | Yes / No segments | True/false toggle |
| `select` | Inline-expand dropdown | Many options (typically 6+) or options are too long for segments (e.g. timezone, locale) |
| `optionList` | Always-visible radio list | Explicit opt-in only — all options must be visible simultaneously |
| `connectionPicker` | Dropdown for accounts + "Connect" button | OAuth connection selection |
| `resourcePicker` | Dropdown with async state (single or multi) | Resource selection from provider (calendar, report, etc.) |
| `text` | Text input | Free-form string entry |
| `custom` | Read-only fallback | Plugin-provided or unsupported kinds |

**Rule:** when a field represents a single value chosen from multiple available options, it defaults to dropdown-style interaction (`select`, `connectionPicker`, `resourcePicker`). Use `optionList` only when always-visible selection is intentionally required.

---

### 6.5 Option

Fields:

- label: string  
- value: string | number  

---

### 6.6 InspectorAction

Fields:

- label: string  
- onClick: function  
- variant?: "primary" | "secondary"  

---

## 7. Shared Components

### 7.1 InspectorPanel

Purpose:

- main container  
- handles header and body  

Props:

- title  
- mode  
- onEdit  
- onSave  
- onCancel  

---

### 7.2 InspectorHeader

Purpose:

- display widget icon and title  
- show actions  

Rules:

- do not display widget ID  
- keep layout clean and minimal  

---

### 7.3 InspectorSection

Purpose:

- group fields logically  

Props:

- title  
- description  
- children  
- actions  

---

### 7.4 InspectorReadOnlyField

Purpose:

- display label + value  

Rules:

- labels are secondary  
- values are primary  
- long values wrap  

---

### 7.5 InspectorFieldGroup

Purpose:

- wrap editable fields  

Props:

- label  
- helperText  
- children  

---

### 7.6 InspectorSegmentedControl

Purpose:

- small enum selection  

Use cases:

- provider  
- time window  
- max events  

---

### 7.7 InspectorBooleanField

Purpose:

- boolean input  

Implementation:

- can be switch or segmented  

---

### 7.8 InspectorDropdown

Purpose:

- inline-expand dropdown for single-choice selection from multiple options

Behavior:

- collapsed: single trigger row showing current selection or placeholder + chevron
- expanded: trigger row + options panel rendered inline below
- selecting an option closes the panel
- disabled: trigger is non-interactive, panel never opens
- empty (no options): shows placeholder text; no interactive trigger

Use cases:

- all `select` fields (via InspectorSelectField)
- account selection inside `connectionPicker`
- resource selection inside `resourcePicker` (single-select and multi-select)

Rules:

- long labels truncate on trigger (numberOfLines=1); full label shown in open panel
- placeholder text shown in secondary color when no value is selected
- trigger border highlights to accentBlue when panel is open

---

### 7.9 InspectorSelectField

Purpose:

- dropdown selection for static option lists

Implementation:

- delegates to InspectorDropdown
- use for any single-choice field with a static options array

---

### 7.10 InspectorOptionList

Purpose:

- always-visible radio-style selectable list

Rules:

- use only when all options must be visible simultaneously
- do NOT use as default for single-choice fields — use `select` (dropdown) instead
- the `optionList` field kind renders this component

---

### 7.11 InspectorConnectionPicker

Purpose:

- select or create integration connection

Layout:

- "Connect new account" button always shown at top
- account selection below: InspectorDropdown when accounts exist, helper text when none

Rules:

- never expose tokens
- `onConnect` is invoked when the user taps "Connect new account"; the widget must not contain OAuth logic
- `onChange` is invoked when the user selects an existing connection via the dropdown

---

### 7.12 InspectorResourcePicker

Purpose:

- select resource from provider

Implementation:

- loading/error/empty states via InspectorAsyncState
- when resources available: InspectorDropdown

Examples:

- calendar
- dashboard
- report

---

### 7.13 InspectorAsyncState

Purpose:

- handle loading, empty, error states

---

## 8. Formatting Layer

Shared utilities must convert raw values into human-readable form.

Examples:

- next7d → Next 7 days  
- true → Yes  
- google → Google  

Rules:

- never display raw enum values directly  
- always prefer friendly labels  

---

## 9. Integration Rules

### 9.1 Connection First

Widgets must:

- require connection before resource selection  

---

### 9.2 Resource Second

Only after connection:

- show resource picker  

---

### 9.3 No Direct OAuth in Widgets

All OAuth logic must be handled outside the widget.

---

## 10. Read-Only Rules

Read-only inspector must:

- show only meaningful configuration  
- hide layout data  
- hide internal IDs  
- show formatted values  

---

## 11. Edit Mode Rules

Edit mode must:

- follow section grouping:
  1. Connection
  2. Resource
  3. Display

- use shared components only
- include helper text where needed

### 11.1 Section Visibility vs Disabled

Prefer `isDisabled` on fields over hiding entire sections when the section represents a step the user has not yet reached:

- Show the section (`isVisible: true`) as soon as the user has committed to the path (e.g. selected Google as provider).
- Disable its fields (`isDisabled: true`) until the prerequisite step is complete (e.g. connection chosen).
- This lets users see what configuration is available before committing to prior steps.

Only use `isVisible: false` on a section when its existence is entirely irrelevant to the current state (e.g. the Google Calendar section when iCal is selected).

---

## 12. Widget Responsibilities

Each widget must:

1. define inspector structure  
2. provide human-readable labels  
3. provide display formatting  
4. avoid raw provider data leakage  

---

## 13. Folder Structure

apps/client/src/features/admin/inspector/

Files:

- InspectorPanel.tsx
- InspectorHeader.tsx
- InspectorSection.tsx
- InspectorReadOnlyField.tsx
- InspectorFieldGroup.tsx
- InspectorSegmentedControl.tsx
- InspectorBooleanField.tsx
- InspectorDropdown.tsx
- InspectorSelectField.tsx
- InspectorOptionList.tsx
- InspectorConnectionPicker.tsx
- InspectorResourcePicker.tsx
- InspectorAsyncState.tsx
- inspector.types.ts
- inspector.formatters.ts

---

## 14. Non-Goals

The inspector system must not:

- render layout controls in read-only mode  
- expose internal database identifiers  
- implement provider-specific UI logic inside widgets  
- duplicate UI patterns across widgets  

---

## 15. Future Extensions

Possible additions:

- validation system for fields  
- advanced/debug mode toggle  
- multi-resource selection  
- plugin-provided custom inspector components  

---

## 16. Summary

The shared inspector API ensures:

- consistency across widgets  
- scalability for plugin ecosystem  
- clean separation between UI and logic  
- improved UX for both read-only and edit modes  

This is a foundational system and must be used by all widgets.
