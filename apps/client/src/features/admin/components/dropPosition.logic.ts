import {
  DISPLAY_GRID_BASE_ROWS,
  DISPLAY_GRID_COLUMNS,
  resolveWidgetLayoutCollision,
  type WidgetLayout,
} from "../../display/components/LayoutGrid.logic";

/** Default size for a widget placed via drag-and-drop. */
export const DEFAULT_DROP_W = 4;
export const DEFAULT_DROP_H = 2;

export interface ComputeDropLayoutOptions {
  /** X coordinate of the drop event relative to the canvas container's left edge. */
  dropX: number;
  /** Y coordinate of the drop event relative to the canvas container's top edge. */
  dropY: number;
  containerWidth: number;
  containerHeight: number;
  /** Layouts of existing widgets keyed by widgetInstanceId — used for collision resolution. */
  existingLayoutsById: Record<string, WidgetLayout>;
  widgetW?: number;
  widgetH?: number;
}

/**
 * Converts a pixel drop position into a grid-snapped, collision-free WidgetLayout.
 *
 * Steps:
 * 1. Convert pixel coords to fractional grid position.
 * 2. Clamp so the widget fits inside the grid bounds.
 * 3. Resolve collisions against existing widget layouts.
 */
export function computeDropLayout(options: ComputeDropLayoutOptions): WidgetLayout {
  const widgetW = options.widgetW ?? DEFAULT_DROP_W;
  const widgetH = options.widgetH ?? DEFAULT_DROP_H;
  const safeWidth = Math.max(options.containerWidth, 1);
  const safeHeight = Math.max(options.containerHeight, 1);

  // Convert pixel drop position to fractional grid coordinates
  const rawGridX = Math.floor((options.dropX / safeWidth) * DISPLAY_GRID_COLUMNS);
  const rawGridY = Math.floor((options.dropY / safeHeight) * DISPLAY_GRID_BASE_ROWS);

  // Clamp so the widget stays inside the grid
  const clampedX = Math.min(Math.max(rawGridX, 0), DISPLAY_GRID_COLUMNS - widgetW);
  const clampedY = Math.min(Math.max(rawGridY, 0), DISPLAY_GRID_BASE_ROWS - widgetH);

  const desiredLayout: WidgetLayout = { x: clampedX, y: clampedY, w: widgetW, h: widgetH };

  // Find the nearest collision-free slot
  return resolveWidgetLayoutCollision({
    widgetId: "__drop_preview__",
    proposedLayout: desiredLayout,
    layoutsById: options.existingLayoutsById,
  });
}

export interface CanvasDropPlacement {
  /** The resolved grid layout (collision-free). */
  layout: WidgetLayout;
  /**
   * Whether the desired drop position was collision-free.
   * false means the widget was relocated to avoid an existing widget.
   */
  isValid: boolean;
}

/**
 * Like computeDropLayout, but also returns whether the placement is collision-free
 * at the desired position. Used to drive the canvas snap preview visual state.
 */
export function computeCanvasDropPlacement(options: ComputeDropLayoutOptions): CanvasDropPlacement {
  const widgetW = options.widgetW ?? DEFAULT_DROP_W;
  const widgetH = options.widgetH ?? DEFAULT_DROP_H;
  const safeWidth = Math.max(options.containerWidth, 1);
  const safeHeight = Math.max(options.containerHeight, 1);

  const rawGridX = Math.floor((options.dropX / safeWidth) * DISPLAY_GRID_COLUMNS);
  const rawGridY = Math.floor((options.dropY / safeHeight) * DISPLAY_GRID_BASE_ROWS);
  const clampedX = Math.min(Math.max(rawGridX, 0), DISPLAY_GRID_COLUMNS - widgetW);
  const clampedY = Math.min(Math.max(rawGridY, 0), DISPLAY_GRID_BASE_ROWS - widgetH);

  const desiredLayout: WidgetLayout = { x: clampedX, y: clampedY, w: widgetW, h: widgetH };
  const resolvedLayout = resolveWidgetLayoutCollision({
    widgetId: "__drop_preview__",
    proposedLayout: desiredLayout,
    layoutsById: options.existingLayoutsById,
  });

  const isValid =
    resolvedLayout.x === desiredLayout.x &&
    resolvedLayout.y === desiredLayout.y &&
    resolvedLayout.w === desiredLayout.w &&
    resolvedLayout.h === desiredLayout.h;

  return { layout: resolvedLayout, isValid };
}
