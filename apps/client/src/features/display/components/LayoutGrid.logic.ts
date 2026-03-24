export const DISPLAY_GRID_COLUMNS = 12;
export const DISPLAY_GRID_BASE_ROWS = 6;

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface ResolveWidgetLayoutCollisionInput {
  widgetId: string;
  proposedLayout: WidgetLayout;
  layoutsById: Record<string, WidgetLayout>;
  columns?: number;
  rows?: number;
}

interface NormalizeWidgetLayoutsInput {
  layoutsById: Record<string, WidgetLayout>;
  orderedWidgetIds: string[];
  columns?: number;
  rows?: number;
}

interface ClampWidgetLayoutInput {
  layout: WidgetLayout;
  columns?: number;
  rows?: number;
}

interface ApplyLayoutDeltaInput {
  layout: WidgetLayout;
  deltaX: number;
  deltaY: number;
  columns?: number;
  rows?: number;
}

export interface LayoutFrame {
  left: number;
  top: number;
  width: number;
  height: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function clampWidgetLayout(input: ClampWidgetLayoutInput): WidgetLayout {
  const columns = input.columns ?? DISPLAY_GRID_COLUMNS;
  const rows = input.rows ?? DISPLAY_GRID_BASE_ROWS;

  const w = clamp(Math.round(input.layout.w), 1, columns);
  const h = clamp(Math.round(input.layout.h), 1, rows);
  const x = clamp(Math.round(input.layout.x), 0, columns - w);
  const y = clamp(Math.round(input.layout.y), 0, rows - h);

  return { x, y, w, h };
}

export function applyDragDelta(input: ApplyLayoutDeltaInput): WidgetLayout {
  return clampWidgetLayout({
    layout: {
      ...input.layout,
      x: input.layout.x + input.deltaX,
      y: input.layout.y + input.deltaY,
    },
    columns: input.columns,
    rows: input.rows,
  });
}

export function applyResizeDelta(input: ApplyLayoutDeltaInput): WidgetLayout {
  return clampWidgetLayout({
    layout: {
      ...input.layout,
      w: input.layout.w + input.deltaX,
      h: input.layout.h + input.deltaY,
    },
    columns: input.columns,
    rows: input.rows,
  });
}

interface ComputeLayoutFrameInput {
  layout: WidgetLayout;
  containerWidth: number;
  containerHeight: number;
  columns?: number;
  baseRows?: number;
}

export function computeLayoutFrame(input: ComputeLayoutFrameInput): LayoutFrame {
  const columns = input.columns ?? DISPLAY_GRID_COLUMNS;
  const baseRows = input.baseRows ?? DISPLAY_GRID_BASE_ROWS;

  const safeWidth = Math.max(input.containerWidth, 0);
  const safeHeight = Math.max(input.containerHeight, 0);
  const rowHeight = safeHeight / baseRows;

  return {
    left: (input.layout.x / columns) * safeWidth,
    width: (input.layout.w / columns) * safeWidth,
    top: input.layout.y * rowHeight,
    height: input.layout.h * rowHeight,
  };
}

interface ResolveWidgetLayoutsInput {
  layouts: WidgetLayout[];
  columns?: number;
}

function overlaps(a: WidgetLayout, b: WidgetLayout): boolean {
  const xOverlap = a.x < b.x + b.w && b.x < a.x + a.w;
  const yOverlap = a.y < b.y + b.h && b.y < a.y + a.h;

  return xOverlap && yOverlap;
}

function canPlaceLayout(
  layout: WidgetLayout,
  otherLayouts: WidgetLayout[],
): boolean {
  return !otherLayouts.some((otherLayout) => overlaps(layout, otherLayout));
}

function findAvailableSlotForSize(
  size: { w: number; h: number },
  otherLayouts: WidgetLayout[],
  preferredStartY: number,
  columns: number,
  rows: number,
): WidgetLayout | null {
  const maxY = rows - size.h;
  const maxX = columns - size.w;
  const safeStartY = clamp(preferredStartY, 0, Math.max(0, maxY));

  for (let y = safeStartY; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { x, y, w: size.w, h: size.h };
      if (canPlaceLayout(candidate, otherLayouts)) {
        return candidate;
      }
    }
  }

  for (let y = 0; y < safeStartY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { x, y, w: size.w, h: size.h };
      if (canPlaceLayout(candidate, otherLayouts)) {
        return candidate;
      }
    }
  }

  return null;
}

function findBestAvailableSlot(
  desiredLayout: WidgetLayout,
  otherLayouts: WidgetLayout[],
  columns: number,
  rows: number,
): WidgetLayout | null {
  const desiredSlot = findAvailableSlotForSize(
    { w: desiredLayout.w, h: desiredLayout.h },
    otherLayouts,
    desiredLayout.y,
    columns,
    rows,
  );

  if (desiredSlot) {
    return desiredSlot;
  }

  for (let h = desiredLayout.h; h >= 1; h -= 1) {
    for (let w = desiredLayout.w; w >= 1; w -= 1) {
      const slot = findAvailableSlotForSize(
        { w, h },
        otherLayouts,
        desiredLayout.y,
        columns,
        rows,
      );
      if (slot) {
        return slot;
      }
    }
  }

  return null;
}

export function resolveWidgetLayoutCollision(
  input: ResolveWidgetLayoutCollisionInput,
): WidgetLayout {
  const columns = input.columns ?? DISPLAY_GRID_COLUMNS;
  const rows = input.rows ?? DISPLAY_GRID_BASE_ROWS;
  const previousLayout = input.layoutsById[input.widgetId];
  const nextLayout = clampWidgetLayout({
    layout: input.proposedLayout,
    columns,
    rows,
  });

  const otherLayouts = Object.entries(input.layoutsById)
    .filter(([candidateId]) => candidateId !== input.widgetId)
    .map(([, layout]) => clampWidgetLayout({ layout, columns, rows }));

  if (!otherLayouts.some((layout) => overlaps(layout, nextLayout))) {
    return nextLayout;
  }

  const bestSlot = findBestAvailableSlot(nextLayout, otherLayouts, columns, rows);
  if (bestSlot) {
    return bestSlot;
  }

  if (!previousLayout) {
    return { x: 0, y: 0, w: 1, h: 1 };
  }

  const safePreviousLayout = clampWidgetLayout({
    layout: previousLayout,
    columns,
    rows,
  });

  if (canPlaceLayout(safePreviousLayout, otherLayouts)) {
    return safePreviousLayout;
  }

  const previousFallbackSlot = findBestAvailableSlot(safePreviousLayout, otherLayouts, columns, rows);
  if (previousFallbackSlot) {
    return previousFallbackSlot;
  }

  return { x: 0, y: 0, w: 1, h: 1 };
}

export function normalizeWidgetLayouts(
  input: NormalizeWidgetLayoutsInput,
): Record<string, WidgetLayout> {
  const columns = input.columns ?? DISPLAY_GRID_COLUMNS;
  const rows = input.rows ?? DISPLAY_GRID_BASE_ROWS;
  const resolvedLayoutsById: Record<string, WidgetLayout> = {};

  for (const widgetId of input.orderedWidgetIds) {
    const proposedLayout = input.layoutsById[widgetId] ?? { x: 0, y: 0, w: 1, h: 1 };
    const resolvedLayout = resolveWidgetLayoutCollision({
      widgetId,
      proposedLayout,
      layoutsById: {
        ...resolvedLayoutsById,
      },
      columns,
      rows,
    });
    resolvedLayoutsById[widgetId] = resolvedLayout;
  }

  return resolvedLayoutsById;
}

function hasAnyOverlap(layouts: WidgetLayout[]): boolean {
  for (let index = 0; index < layouts.length; index += 1) {
    for (let candidateIndex = index + 1; candidateIndex < layouts.length; candidateIndex += 1) {
      if (overlaps(layouts[index], layouts[candidateIndex])) {
        return true;
      }
    }
  }

  return false;
}

function shouldAutoFlow(layouts: WidgetLayout[]): boolean {
  if (layouts.length === 0) {
    return false;
  }

  if (hasAnyOverlap(layouts)) {
    return true;
  }

  if (layouts.length === 1) {
    return layouts[0].w < 4 || layouts[0].h < 3;
  }

  return layouts.every((layout) => layout.w <= 2 && layout.h <= 1);
}

export function resolveWidgetLayouts(input: ResolveWidgetLayoutsInput): WidgetLayout[] {
  const columns = input.columns ?? DISPLAY_GRID_COLUMNS;
  const layouts = input.layouts;

  if (!shouldAutoFlow(layouts)) {
    return layouts;
  }

  const columnsPerWidget = Math.max(3, Math.floor(columns / Math.min(layouts.length, 4)));
  const widgetsPerRow = Math.max(1, Math.floor(columns / columnsPerWidget));

  return layouts.map((_, index) => {
    const row = Math.floor(index / widgetsPerRow);
    const columnOffset = index % widgetsPerRow;
    const x = columnOffset * columnsPerWidget;
    const isLastColumnInRow = columnOffset === widgetsPerRow - 1;
    const width = isLastColumnInRow ? columns - x : columnsPerWidget;

    return {
      x,
      y: row * 2,
      w: width,
      h: 2,
    };
  });
}
