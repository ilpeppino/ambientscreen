export const DISPLAY_GRID_COLUMNS = 12;
export const DISPLAY_GRID_BASE_ROWS = 6;

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface LayoutFrame {
  left: number;
  top: number;
  width: number;
  height: number;
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
