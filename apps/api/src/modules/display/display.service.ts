import type { WidgetConfigSchema, WidgetDataState, WidgetKey } from "@ambient/shared-contracts";
import { widgetsService } from "../widgets/widgets.service";
import {
  normalizeWidgetConfig,
  validateWidgetConfig,
  type SupportedWidgetType,
} from "../widgets/widget-contracts";
import { getWidgetPlugin } from "../widgets/widgetPluginRegistry";

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
  config: Record<string, unknown>;
  configSchema: WidgetConfigSchema;
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
  async getDisplayLayout(profileId: string): Promise<DisplayLayoutResponse> {
    const widgets = await widgetsService.getProfileWidgets(profileId);

    const resolvedWidgets = await Promise.all(widgets.map(async (widget) => {
      const resolvedAt = new Date().toISOString();
      const widgetType = widget.type as SupportedWidgetType;
      const plugin = getWidgetPlugin(widgetType);
      const normalizedConfig = normalizeWidgetConfig(widgetType, widget.config) as Record<string, unknown>;
      const configSchema = (plugin?.configSchema ?? {}) as WidgetConfigSchema;

      if (!plugin?.api?.resolveData) {
        return {
          widgetInstanceId: widget.id,
          widgetKey: widgetType,
          layout: widget.layout,
          state: "error" as const,
          config: normalizedConfig,
          configSchema,
          data: null,
          meta: {
            resolvedAt,
            errorCode: "UNSUPPORTED_WIDGET_TYPE",
            message: `Unsupported widget type: ${widget.type}`,
          },
        };
      }

      const validationResult = validateWidgetConfig(widgetType, widget.config);
      if (!validationResult.success) {
        return {
          widgetInstanceId: widget.id,
          widgetKey: widgetType,
          layout: widget.layout,
          state: "error" as const,
          config: normalizedConfig,
          configSchema,
          data: null,
          meta: {
            resolvedAt,
            errorCode: "INVALID_WIDGET_CONFIG",
            message: "Widget config is invalid.",
          },
        };
      }

      try {
        const resolvedWidgetData = await plugin.api.resolveData({
          widgetInstanceId: widget.id,
          widgetKey: widgetType,
          widgetConfig: normalizedConfig,
        });

        return {
          widgetInstanceId: resolvedWidgetData.widgetInstanceId,
          widgetKey: resolvedWidgetData.widgetKey,
          layout: widget.layout,
          state: normalizeState(resolvedWidgetData.state),
          config: normalizedConfig,
          configSchema,
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
          config: normalizedConfig,
          configSchema,
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
