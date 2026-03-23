# Navigation Contract

Ambient Screen uses a **flat state-based navigation** model with no router library. This document defines the rules that all screens must follow.

## Architecture

Navigation is managed as a single `AppMode` enum in `App.tsx`. There is no navigation stack — each transition is a full-screen replace. All navigation intent is expressed via **callback props** passed from the parent to each screen.

```
admin (hub)
  ├── → display       (onEnterDisplayMode)
  ├── → remoteControl (onEnterRemoteControlMode)
  └── → marketplace   (onEnterMarketplace)

display        → admin (onExitDisplayMode)
remoteControl  → admin (onBack)
marketplace    → admin (onBack)
```

All exit transitions return to `admin`. There is no lateral navigation between non-admin modes.

## Rules

### 1. Every screen must have a valid back path

- All non-admin screens receive a back callback prop.
- The callback must always lead to a defined `AppMode`.
- Use the functions in `appMode.logic.ts` — never hardcode mode strings in screens.

### 2. Mode transitions are logged

`applyModeChange()` in `App.tsx` logs every transition to `console.info` as:

```
[nav] {fromMode} → {toMode}
```

Use this for debugging unexpected navigation.

### 3. Modals must not break the navigation stack

- Modals are rendered within their screen's component tree, not as separate routes.
- Opening a modal does not change `AppMode`.
- Closing a modal returns the screen to its pre-modal state.
- `dismissible=false` on `ConfirmDialog` forces explicit user choice — do not override.

### 4. Android hardware back button follows this priority order (DisplayScreen)

1. Widget settings modal open → close modal
2. Pending exit confirmation dialog → dismiss it
3. Edit mode active → cancel edit mode (discard draft changes)
4. Default → exit display mode (if handler provided)

### 5. State flags must not replace navigation transitions

Permitted uses of local state flags:
- Modal visibility (`settingsWidgetId`, `selectedPlugin`, etc.)
- Edit mode within a screen (`editMode` in DisplayScreen)
- Entitlement gate overlays (`upgradeModalVisible`)

Not permitted:
- Using a boolean flag to simulate navigation between distinct screens
- Hiding the back button based on async operation state (user must always be able to cancel)

### 6. Destructive exits require confirmation

If a screen has unsaved user changes (e.g., layout edits in DisplayScreen), navigating away must show a `ConfirmDialog` before proceeding. The confirm action discards changes and exits. Cancel returns the user to the screen.

### 7. Navigation params must be explicit

Screens receive all data they need via props. No implicit shared mutable state is used to pass navigation context. Callback props carry navigation intent; data props carry screen content.

### 8. No dead-end states

Every state a screen can enter must have at least one exit path:
- Error states: show error message with a dismiss or retry action
- Empty states: show an empty panel with a clear message; back button remains accessible
- Loading states: do not hide the back button while loading

## Adding New Modes

1. Add the mode to `AppMode` in `appMode.logic.ts`
2. Add `enterXMode()` and `exitXMode()` functions (always return `"admin"` for exit)
3. Add mode rendering in `AuthenticatedApp` in `App.tsx`
4. Pass an `onBack` callback to the new screen
5. Add tests to `tests/appMode.logic.test.ts`

## Files

| File | Role |
|------|------|
| `src/features/navigation/appMode.logic.ts` | Mode transition pure functions |
| `App.tsx` — `applyModeChange()` | Applies transitions with logging |
| `App.tsx` — `AuthenticatedApp` | Renders the active screen |
