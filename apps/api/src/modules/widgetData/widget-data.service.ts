import { widgetsService } from "../widgets/widgets.service";

export const widgetDataService = {
  async getWidgetData(widgetId: string) {
    const widget = await widgetsService.getWidgetById(widgetId);

    if (!widget) {
      return null;
    }

    if (widget.type === "clockDate") {
      const now = new Date();

      return {
        widgetInstanceId: widget.id,
        widgetKey: "clockDate",
        state: "ready" as const,
        data: {
          nowIso: now.toISOString(),
          formattedTime: new Intl.DateTimeFormat("en-GB", {
            hour: "2-digit",
            minute: "2-digit",
            second: "2-digit",
            hour12: false
          }).format(now),
          formattedDate: new Intl.DateTimeFormat("en-GB", {
            day: "2-digit",
            month: "long",
            year: "numeric"
          }).format(now),
          weekdayLabel: new Intl.DateTimeFormat("en-GB", {
            weekday: "long"
          }).format(now)
        },
        meta: {
          fetchedAt: now.toISOString(),
          source: "system"
        }
      };
    }

    return {
      widgetInstanceId: widget.id,
      widgetKey: widget.type,
      state: "error" as const,
      data: null,
      meta: {
        message: `Unsupported widget type: ${widget.type}`
      }
    };
  }
};