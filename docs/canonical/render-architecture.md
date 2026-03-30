# Canonical Rendering Architecture

Status: Draft v1  
Scope: Client rendering layer (display + admin preview)  
Applies to: All widgets (built-in + plugins)

---

## 1. Purpose

This document defines how widgets are rendered at runtime across all sizes, with a focus on display mode (fullscreen, ambient viewing).

It complements:
- Plugin SDK (contracts, data flow)
- Golden widget examples (implementation patterns)
- Architecture (server/client responsibilities)

This document answers:
“Given a widget and its size, how should it look?”

---

## 2. Core Principles

### 2.1 Readability over density
Content must be readable from distance (TV/tablet use case).  
If content does not fit safely → hide lower-priority content.

### 2.2 No overlap, ever
Text must never collide.  
Layout must degrade safely instead of breaking.

### 2.3 Centered composition
All widgets are visually centered.  
No dashboard/grid-style layouts in display mode.

### 2.4 One widget per slide (current scope)
Rendering assumes a single widget occupies the slide.  
Multi-widget slides are out of scope for now.

### 2.5 Scaled versions, not different designs
Same composition structure across sizes.  
Larger sizes → more space, larger scale, more visible detail.

### 2.6 Fullscreen = 100% slide
Defined as layoutW = 12 and layoutH = 6.

### 2.7 Apple TV style
Minimal  
Calm  
Large typography  
Generous spacing  
No chrome unless required

---

## 3. Render Context (Runtime Input)

Every renderer must receive a render context.

interface WidgetRenderContext {
  viewportWidth: number
  viewportHeight: number

  widgetWidth: number
  widgetHeight: number

  widthRatio: number
  heightRatio: number
  areaRatio: number

  isFullscreen: boolean

  orientation: "landscape" | "portrait"
  platform: "web" | "ios" | "android" | "unknown"
  safeAreaInsets: {
    top: number
    right: number
    bottom: number
    left: number
  }

  sizeTier: "compact" | "regular" | "large" | "fullscreen"
}

Rules:
- Derived from SlideItem layout, never from defaultLayout
- Must be passed into all renderers
- Renderers must use it

---

## 4. Size Tier System

### 4.1 Tiers

compact  
regular  
large  
fullscreen  

### 4.2 Derivation

Fullscreen:
layoutW === 12 and layoutH === 6

Otherwise:
areaRatio = widget area / slide area

Use thresholds to classify:
compact → small area  
regular → medium  
large → high  
fullscreen → explicit rule  

Thresholds must be centralized and consistent.

Current canonical tier derivation (runtime):
- fullscreen: widthRatio >= 0.98 AND heightRatio >= 0.98
- large: areaRatio >= 0.24 OR (widthRatio >= 0.65 AND heightRatio >= 0.35)
- regular: areaRatio >= 0.11 OR (widthRatio >= 0.45 AND heightRatio >= 0.26)
- compact: otherwise

---

## 5. Composition Model

### 5.1 Three Regions

Every widget renderer must structure content into:

Hero Region  
Primary value (time, temperature, etc.)

Support Region  
Labels, context (date, location, condition)

Detail Region  
Lists, forecast, events

---

### 5.2 Vertical Allocation (Fullscreen)

Hero: 50–60%  
Support: 20–25%  
Detail: 20–25%  

### 5.3 Vertical Allocation by Tier (Canonical Runtime)

All tiers use explicit Hero/Support/Detail region budgets.

- compact: Hero 64%, Support 24%, Detail 12%
- regular: Hero 56%, Support 24%, Detail 20%
- large: Hero 54%, Support 24%, Detail 22%
- fullscreen: Hero 56%, Support 22%, Detail 22%

---

### 5.4 Behavior Across Sizes

compact:
- hero + minimal support

regular:
- balanced layout

large:
- increased spacing and hierarchy

fullscreen:
- full region separation
- maximum readability

---

## 6. Typography and Scaling System

### 6.1 Token-Based Scaling

font.hero  
font.title  
font.body  
font.meta  

space.xs → space.xl  

icon.sm → icon.hero  

---

### 6.2 Scaling Rule

Use the largest token size that preserves:
- region separation
- spacing integrity
- zero overlap

### 6.3 Region-Fitted Typography Rule (All Tiers)

For every text element in Hero, Support, and Detail:
- compute text target size from tier/scaling tokens
- cap by region-height budget (per region)
- derive lineHeight from final font size (lineHeight must exceed font size)
- if insufficient space remains, reduce lower-priority content first (detail -> support -> hero)

This rule applies to compact, regular, large, and fullscreen.

---

### 6.4 Hierarchy

hero → primary value  
title → secondary emphasis  
body → main content  
meta → minor information  

---

## 7. Content Density Rules

### 7.1 Visibility Policy

Never hide primary value  
Never hide inspector-selected core data unless required  
As size increases → show more data  
If space is insufficient → hide least important data  

---

### 7.2 Priority Order

1. primary value  
2. primary label  
3. core config data  
4. secondary data  
5. tertiary data  

---

### 7.3 Clarification

Inspector defines maximum content  
Render context defines safe visible subset  

---

## 8. BaseWidgetFrame Responsibilities

### 8.1 Role

BaseWidgetFrame is a responsive layout shell.

It provides:
- safe inner bounds
- padding
- spacing tokens
- layout helpers
- loading / empty / error states
- fullscreen-safe centering

---

### 8.2 Fullscreen Behavior

In fullscreen:
- increased padding
- stronger vertical rhythm
- no headers or footers
- no chrome
- pure content

---

## 9. Overflow Rules

### 9.1 Never allow

text overlap  
clipping of primary content  
unreadable density  

---

### 9.2 When space is insufficient

1. reduce detail  
2. hide tertiary info  
3. reduce secondary info  
4. only then reduce hero scale  

---

## 10. Golden Widget Rendering Rules

### 10.1 Clock

Fullscreen:
- Hero: large time (centered)
- Support: weekday + date (lower, spaced)
- Detail: none

Rules:
- extra breathing space below hero
- never stack tightly
- reduce hero size if support collides

---

### 10.2 Weather

Fullscreen:
- Hero: temperature + icon (balanced scale)
- Support: location + condition
- Detail: forecast strip (always shown)

Rules:
- icon must scale with temperature
- forecast items must remain readable
- no tiny elements under large hero

---

### 10.3 Calendar

Fullscreen:
- Hero: first upcoming event (highlighted)
- Support: event metadata
- Detail: remaining events

Rules:
- number of events shown = maximum safe fit
- no scrolling
- row height must scale with typography
- never compress rows to fit more

---

## 11. Animation

Slide transitions use a subtle fade  
No aggressive motion  
Maintain calm ambient feel  

---

## 12. Testing Requirements

Renderers must be tested for:

- compact vs fullscreen behavior  
- no overlap scenarios  
- typography scaling correctness  
- density adaptation  

---
