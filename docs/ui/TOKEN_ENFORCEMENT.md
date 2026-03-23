# Token Enforcement

All visual values in `apps/client/src` must use design tokens rather than hardcoded literals.

## What must use tokens

| Value type | Example violation | Correct usage |
|---|---|---|
| Hex colors | `"#2d8cff"` | `colors.accentBlue` |
| Named color strings | `"white"`, `"black"` | `colors.textPrimary`, `colors.backgroundPrimary` |

Exceptions: `"transparent"` is allowed as a named color.

## What does NOT need tokens

- `rgba()` values used for semi-transparent overlays (e.g. `"rgba(0,0,0,0.75)"`)
- Percentage strings (`"100%"`, `"85%"`)
- Absolute positioning values (`top`, `left`, `zIndex`)
- Layout values (`flex`, `width`, `maxWidth`, `minWidth`)

## Token file locations

All token files live in `apps/client/src/shared/ui/theme/`:

| File | Exports |
|---|---|
| `colors.ts` | `colors` — all color tokens |
| `typography.ts` | `typography` — font size + weight presets |
| `spacing.ts` | `spacing` — spacing scale + screenPadding |
| `radius.ts` | `radius` — border radius presets including pill |
| `shadows.ts` | `shadows` — shadow presets |
| `motion.ts` | `motion` — animation duration tokens |
| `index.ts` | Re-exports all of the above |

## How to add a new token

1. Open the appropriate token file.
2. Add the new value to the `const` object with a descriptive semantic name.
3. Import and use the token in your component — do not write the raw hex value in component files.

Example: adding a new surface color:

```typescript
// colors.ts
export const colors = {
  // ... existing tokens ...
  surfaceOverlay: "#1a1f2e",
} as const;
```

## Accepted fontSize exceptions

The following font sizes have no exact token equivalent and are accepted in the codebase:

| Size | Reason |
|---|---|
| 11 | Sub-caption size used in display-mode overlay labels |
| 15 | Between `body` (16) and `small` (13); used in UpgradeModal featureText |
| 22 | Between `subtitle` (18) and `title` (30); used in UpgradeModal title |
| 24 | Auth screen title; larger than subtitle but smaller than title token |

## Accepted borderRadius exceptions

| Value | Token equivalent | Used for |
|---|---|---|
| 999 | Use `radius.pill` (9999) instead | Fully-rounded pill shapes |

## Running the check

```bash
# From apps/client:
node scripts/check-tokens.js

# Via npm script:
npm run check-tokens

# Included in lint:
npm run lint
```

Exit code 0 = no violations. Exit code 1 = violations found (blocks merge).

## CI

Token enforcement runs as a separate step in `client-quality` after `Lint`. Both must pass before a PR can merge.
