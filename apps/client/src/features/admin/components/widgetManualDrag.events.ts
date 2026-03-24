import type { CreatableWidgetType } from "../adminHome.logic";

export const MANUAL_WIDGET_DRAG_MOVE_EVENT = "ambient-widget-manual-drag-move";
export const MANUAL_WIDGET_DRAG_END_EVENT = "ambient-widget-manual-drag-end";

export interface ManualWidgetDragDetail {
  widgetType: CreatableWidgetType;
  clientX: number;
  clientY: number;
  defaultLayout?: {
    w: number;
    h: number;
  };
}

