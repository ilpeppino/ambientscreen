import type { WidgetDataState, WidgetKey } from "@ambient/shared-contracts";
import { widgetsService } from "../widgets/widgets.service";
import { widgetResolvers } from "../widgetData/widget-resolvers";

type DisplayWidgetState = "ready" | "loading" | "error" | "empty";

export interface DisplayLayoutWidgetEnvelope {
  widgetInstanceId: string;
  widgetKey: WidgetKey;
  layout: {
    x: number;
    y: number;
    w: number;
    h: number;
  };
  state: DisplayWidgetState;
  data: Record<string, unknown> | null;
  meta: {
    resolvedAt: string;
    errorCode?: string;
    message?: string;
    source?: string;
    fetchedAt?: string;
    staleAt?: string;
    fromCache?: boolean;
  };
}

export interface DisplayLayoutResponse {
  widgets: DisplayLayoutWidgetEnvelope[];
}

function normalizeState(state: WidgetDataState): DisplayWidgetState {
  if (state === "stale") {
    return "loading";
  }

  return state;
}

export const displayService = {
  async getDisplayLayout(userId: string): Promise<DisplayLayoutResponse> {
    const widgets = await widgetsService.getUserWidgets(userId);

    const resolvedWidgets = await Promise.all(widgets.map(async (widget) => {
      const resolvedAt = new Date().toISOString();
      const resolver = widgetResolvers[widget.type as WidgetKey];

      if (!resolver) {
        return {
          widgetInstanceId: widget.id,
          widgetKey: widget.type as WidgetKey,
          layout: widget.layout,
          state: "error" as const,
          data: null,
          meta: {
            resolvedAt,
            errorCode: "UNSUPPORTED_WIDGET_TYPE",
            message: `Unsupported widget type: ${widget.type}`,
          },
        };
      }

      try {
        const resolvedWidgetData = await resolver({
          widgetInstanceId: widget.id,
          widgetConfig: widget.config,
        });

        return {
          widgetInstanceId: resolvedWidgetData.widgetInstanceId,
          widgetKey: resolvedWidgetData.widgetKey,
          layout: widget.layout,
          state: normalizeState(resolvedWidgetData.state),
          data: (resolvedWidgetData.data as Record<string, unknown> | null) ?? null,
          meta: {
            ...resolvedWidgetData.meta,
            resolvedAt,
          },
        };
      } catch {
        return {
          widgetInstanceId: widget.id,
          widgetKey: widget.type as WidgetKey,
          layout: widget.layout,
          state: "error" as const,
          data: null,
          meta: {
            resolvedAt,
            errorCode: "WIDGET_RESOLUTION_FAILED",
            message: "Widget data could not be resolved.",
          },
        };
      }
    }));

    return {
      widgets: resolvedWidgets,
    };
  },
};
