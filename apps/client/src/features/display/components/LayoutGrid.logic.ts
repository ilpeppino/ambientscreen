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

  const maxY = rows - nextLayout.h;
  const maxX = columns - nextLayout.w;
  const preferredStartY = Math.min(Math.max(nextLayout.y, 0), maxY);

  for (let y = preferredStartY; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { ...nextLayout, x, y };
      if (!otherLayouts.some((layout) => overlaps(layout, candidate))) {
        return candidate;
      }
    }
  }

  for (let y = 0; y < preferredStartY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { ...nextLayout, x, y };
      if (!otherLayouts.some((layout) => overlaps(layout, candidate))) {
        return candidate;
      }
    }
  }

  if (!previousLayout) {
    return nextLayout;
  }

  return clampWidgetLayout({
    layout: previousLayout,
    columns,
    rows,
  });
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
