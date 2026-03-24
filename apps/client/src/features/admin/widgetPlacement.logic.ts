import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { WidgetKey } from "@ambient/shared-contracts";
import type { DisplayLayoutWidgetEnvelope } from "../../services/api/displayLayoutApi";
import {
  DISPLAY_GRID_BASE_ROWS,
  DISPLAY_GRID_COLUMNS,
  resolveWidgetLayoutCollision,
  type WidgetLayout,
} from "../display/components/LayoutGrid.logic";

export interface WidgetDefaultSize {
  w: number;
  h: number;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function getWidgetDefaultSize(widgetType: WidgetKey): WidgetDefaultSize {
  const defaultLayout = widgetBuiltinDefinitions[widgetType]?.manifest?.defaultLayout;
  const fallback = { w: 4, h: 2 };
  const w = clamp(Math.round(defaultLayout?.w ?? fallback.w), 1, DISPLAY_GRID_COLUMNS);
  const h = clamp(Math.round(defaultLayout?.h ?? fallback.h), 1, DISPLAY_GRID_BASE_ROWS);

  return { w, h };
}

export function buildLayoutsById(widgets: DisplayLayoutWidgetEnvelope[]): Record<string, WidgetLayout> {
  return Object.fromEntries(widgets.map((widget) => [widget.widgetInstanceId, widget.layout]));
}

/**
 * Deterministic click-to-add placement:
 * start from (0,0) with default widget size, then resolve to first collision-free slot.
 */
export function resolveClickAddLayout(
  widgets: DisplayLayoutWidgetEnvelope[],
  widgetType: WidgetKey,
): WidgetLayout {
  const size = getWidgetDefaultSize(widgetType);
  const proposedLayout: WidgetLayout = {
    x: 0,
    y: 0,
    w: size.w,
    h: size.h,
  };

  return resolveWidgetLayoutCollision({
    widgetId: "__new_widget__",
    proposedLayout,
    layoutsById: buildLayoutsById(widgets),
  });
}
