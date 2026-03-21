import type { WidgetDataEnvelope } from "@ambient/shared-contracts";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";

export function toWidgetEnvelope(widget: DisplayLayoutWidgetEnvelope): WidgetDataEnvelope<unknown> {
  return {
    widgetInstanceId: widget.widgetInstanceId,
    widgetKey: widget.widgetKey,
    state: "ready",
    data: widget.data,
    meta: {
      fetchedAt: widget.meta.fetchedAt,
      staleAt: widget.meta.staleAt,
      source: widget.meta.source,
      fromCache: widget.meta.fromCache,
      errorCode: widget.meta.errorCode,
      message: widget.meta.message,
    },
  };
}

export function getWidgetErrorLabel(widget: DisplayLayoutWidgetEnvelope): string {
  if (widget.meta.message && widget.meta.message.trim().length > 0) {
    return widget.meta.message;
  }

  return "Widget unavailable";
}

const BASE_CANVAS_WIDTH = 640;
const BASE_CANVAS_HEIGHT = 360;
const MIN_WIDGET_SCALE = 0.28;

export function computeWidgetScale(width: number, height: number): number {
  const safeWidth = Math.max(width, 0);
  const safeHeight = Math.max(height, 0);

  if (safeWidth === 0 || safeHeight === 0) {
    return 1;
  }

  const widthScale = safeWidth / BASE_CANVAS_WIDTH;
  const heightScale = safeHeight / BASE_CANVAS_HEIGHT;
  const rawScale = Math.min(widthScale, heightScale);

  return Math.max(MIN_WIDGET_SCALE, Math.min(1, rawScale));
}
