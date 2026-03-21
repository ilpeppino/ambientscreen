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
