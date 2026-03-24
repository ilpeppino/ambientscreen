import type { CreatableWidgetType } from "../adminHome.logic";

export const MANUAL_WIDGET_DRAG_MOVE_EVENT = "ambient-widget-manual-drag-move";
export const MANUAL_WIDGET_DRAG_END_EVENT = "ambient-widget-manual-drag-end";

/** Fired when an HTML5 drag starts from the widget library (after long-press threshold). */
export const WIDGET_DRAG_START_EVENT = "ambient-widget-drag-start";

/** Fired by the canvas when the drag cursor enters or leaves the canvas area. */
export const WIDGET_DRAG_CANVAS_HOVER_EVENT = "ambient-widget-drag-canvas-hover";

export interface ManualWidgetDragDetail {
  widgetType: CreatableWidgetType;
  clientX: number;
  clientY: number;
  defaultLayout?: {
    w: number;
    h: number;
  };
}

export interface WidgetDragStartDetail {
  widgetType: CreatableWidgetType;
  defaultLayout?: {
    w: number;
    h: number;
  };
}

export interface WidgetDragCanvasHoverDetail {
  isOverCanvas: boolean;
}

