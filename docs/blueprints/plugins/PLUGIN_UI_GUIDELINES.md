> Status: Non-canonical
> Type: Blueprint
> Authority: Not the primary source of truth when a canonical doc exists

# Plugin UI Guidelines

This document explains how widget plugins must integrate with the Ambient Screen shared UI system. All plugins must follow these guidelines so that every widget feels native to the product regardless of who authored it.

---

## Core Principle

Widget plugins are part of the Ambient Screen dashboard. They must look and behave as if they were built by the same team that built the rest of the product. The shared UI system provides the building blocks to make this easy — use them.

Do not:
- Write custom container components that replicate what `BaseWidgetFrame` provides
- Hardcode colors, spacing, or radius values
- Import Lucide icons directly
- Mix typography styles that don't come from theme tokens
- Implement your own loading, error, or empty states

---

## Widget Surface Expectations

Every renderer must use `BaseWidgetFrame` as its outer wrapper. This component renders the surface (border, background, radius), header (icon + title), and routes data states automatically.

```typescript
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";

<BaseWidgetFrame
  title="My Widget"           // displayed in the header
  icon="star"                 // AppIconName
  state={state}               // pass through from WidgetRendererProps
  hasData={Boolean(data)}     // determines whether children render or fallback shows
  emptyMessage="No data yet." // optional, shown in the empty state
  errorMessage="Failed."      // optional, shown in the error state
  mode="display"              // "display" | "edit" — controls surface visual weight
  isSelected={false}          // shows selection highlight in edit mode
>
  {/* your widget content */}
</BaseWidgetFrame>
```

### Surface padding

`BaseWidgetFrame` applies `paddingHorizontal: spacing.xl` (24) and `paddingVertical: spacing.lg` (16). Your content should not add outer padding on top of this — it will double the margin.

### Surface radius

The surface uses `radius.lg` (16–20). Do not clip children with a smaller radius or add borders of your own.

---

## Title and Header Conventions

The `WidgetHeader` (rendered inside `BaseWidgetFrame`) shows an icon and a title. Follow these rules:

- **Title**: Short, noun-based (e.g. `"Clock"`, `"Weather"`, `"Calendar"`). Avoid verbs or full sentences.
- **Icon**: Must be a valid `AppIconName`. Use the icon that semantically represents the data type:
  - `"clock"` for time widgets
  - `"weather"` for weather and environmental widgets
  - `"calendar"` for schedule and event widgets
  - `"star"` for general/premium widgets
  - `"grid"` for data or generic content widgets

In display mode, the header is rendered in a subdued style (caption text, secondary color). In edit mode it is more prominent. This is automatic — do not override header styles.

---

## Icon Usage Rules

All icons must come from the `AppIcon` component. Do not import from `lucide-react-native` directly.

```typescript
import { AppIcon } from "../../shared/ui/components/AppIcon";

// Correct
<AppIcon name="calendar" size="sm" color="textSecondary" />

// Wrong — do not do this
import { Calendar } from "lucide-react-native";
<Calendar size={16} color="#9A9A9A" />
```

### Available icons

`lock`, `star`, `settings`, `search`, `refresh`, `calendar`, `weather`, `clock`, `grid`, `chevronLeft`, `chevronRight`, `check`, `plus`, `close`, `trash`

### Size tokens

| Token | Pixels | Use |
|---|---|---|
| `"sm"` | 16–20 | Inline with text, header icons |
| `"md"` | 24 | Default, standalone icons |
| `"lg"` | 32 | Empty state icons |
| `"xl"` | 48–64 | Hero icons, large accent |

### Color tokens

Use `ColorToken` values — do not pass raw hex strings:

| Token | Value | Use |
|---|---|---|
| `"textPrimary"` | `#FFFFFF` | Main content icons |
| `"textSecondary"` | `#9A9A9A` | Subdued icons, header in display mode |
| `"accent"` | `#F5A623` | Selected state, highlights |
| `"error"` | `#FF6B6B` | Error icons |

---

## Loading, Error, Empty, and Locked States

### Automatic state handling via BaseWidgetFrame

Pass `state` and `hasData` to `BaseWidgetFrame` — it renders the appropriate state UI automatically:

| `state` | `hasData` | What renders |
|---|---|---|
| `"ready"` or `"stale"` | `true` | Your `children` |
| `"empty"` | any | `WidgetState type="empty"` with `emptyMessage` |
| `"error"` | any | `WidgetState type="error"` with `errorMessage` |
| any | `false` | `WidgetState type="empty"` with `emptyMessage` |

### Stale data

When `state === "stale"` and `hasData === true`, the widget renders its content normally. Stale data is still valid enough to display — do not show an error state for stale data. The platform may add a visual indicator for staleness in the widget container layer in the future.

### Locked state (premium)

Widgets with `premium: true` in their manifest are wrapped in a locked overlay by the widget container when the user does not have the `premium_widgets` entitlement. Plugin renderers do not implement locking — it is handled by the platform layer before the renderer is called.

Do not add your own lock icons, blur effects, or premium badges inside the renderer.

### Custom messages

Provide short, plain-language messages:

```typescript
emptyMessage="No events scheduled."   // calendar widget
emptyMessage="No weather data yet."   // weather widget
errorMessage="Unable to load data."   // generic fallback
```

Avoid technical messages like "PROVIDER_FAILURE" or "null reference" in user-visible messages.

---

## Display Mode vs Edit Mode Behavior

The `mode` prop controls how the widget renders in different platform contexts.

### Display mode (default)

Ambient Screen's primary purpose is passive ambient viewing. In display mode:

- Surface has minimal chrome (subtle border, near-transparent background)
- Header text is small, subdued
- Widget content should maximize legibility at a distance
- Avoid dense text blocks, long descriptions, or busy visual elements
- Large numbers, bold type, and generous whitespace are preferred

### Edit mode

When the user is arranging their dashboard:

- Surface has stronger borders and slightly lighter background
- Header text is more prominent
- Selection highlight appears when `isSelected={true}`
- Content should still render normally — edit mode does not disable the widget

In practice, built-in renderers pass `mode` through to `BaseWidgetFrame` from the display context. Unless you have a specific reason to change rendering behavior in edit mode, let `BaseWidgetFrame` handle the visual difference automatically.

---

## Typography Guidelines

Use the `Text` component with variant and color tokens. Do not use raw `<Text>` from React Native with hardcoded style values.

```typescript
import { Text } from "../../shared/ui/components";

// Primary data value — large, white
<Text variant="display" color="textPrimary">08:42</Text>

// Secondary label — small, muted
<Text variant="caption" color="textSecondary">MONDAY</Text>

// Body text
<Text variant="body" color="textPrimary">5 events today</Text>
```

### Typography rules for widgets

- **Primary value** (time, temperature, count): large type, `textPrimary` color
- **Secondary label** (unit, category, metadata): small type, `textSecondary` color
- **No body paragraphs**: widgets are glanceable — if you are writing multiple sentences, rethink the design

### Responsive sizing

For widgets with very large type (e.g. clocks), use `useWindowDimensions` to scale font size relative to screen width. Use `adjustsFontSizeToFit` and `numberOfLines={1}` to prevent overflow. See `ClockDateRenderer` for the reference pattern.

---

## When to Use Custom UI vs Shared Components

| Situation | Approach |
|---|---|
| Standard data display (time, weather, events) | `BaseWidgetFrame` + `Text` + theme tokens |
| Expressive or data-rich widgets (charts, maps) | `BaseWidgetFrame` wrapper + custom content inside |
| Custom header needed | Not supported — use `BaseWidgetFrame` title and icon props |
| Custom error/empty state message | Pass `emptyMessage` / `errorMessage` to `BaseWidgetFrame` |
| Custom loading animation | Not currently supported — use `WidgetState` |
| Custom surface (no border, different radius) | Not recommended; avoid unless there is a strong design reason |

Weather and other expressive widgets may use richer visuals inside the content area of `BaseWidgetFrame`, but the outer frame (surface, header, state handling) must remain consistent.

---

## Readability and Low-Clutter Guidelines

Ambient Screen is designed to be read in under two seconds from across a room. Plugin authors must optimize for this:

- One primary value per widget — the user's eye should land immediately on the most important piece of information
- Use whitespace generously — the theme spacing scale provides `spacing.sm` through `spacing.xxl`; use `spacing.xl` and `spacing.xxl` for major separations
- Avoid icons as decoration — every icon should carry semantic meaning
- Avoid animations in display mode — they distract from the ambient experience; if you need motion, use `react-native-reanimated` with short, subtle transitions
- Dark background is mandatory — all widgets render on `colors.backgroundPrimary` (`#000000`); never set a light background inside a widget

---

## Spacing Reference

```typescript
import { spacing } from "../../shared/ui/theme";

spacing.xs   // 4  — tight gaps within a component
spacing.sm   // 8  — gap between icon and label
spacing.md   // 12 — gap between items
spacing.lg   // 16 — padding, section separation
spacing.xl   // 24 — surface padding (used by BaseWidgetFrame)
spacing.xxl  // 32 — major section breaks
```

---

## Checklist for Plugin UI

- [ ] Renderer uses `BaseWidgetFrame` as the outer wrapper
- [ ] `state` and `hasData` are passed to `BaseWidgetFrame`
- [ ] `emptyMessage` and `errorMessage` are set with plain-language text
- [ ] All colors come from `colors.*` theme tokens
- [ ] All spacing comes from `spacing.*` theme tokens
- [ ] Icons use `AppIcon` with a valid `AppIconName` and size/color tokens
- [ ] No custom lock, blur, or premium badge UI in the renderer
- [ ] Large primary values are readable at a glance
- [ ] No hardcoded hex values, font sizes outside theme, or inline margins
