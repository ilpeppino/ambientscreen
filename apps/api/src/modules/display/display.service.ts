import type { WidgetConfigSchema, WidgetDataState, WidgetKey } from "@ambient/shared-contracts";
import { slidesService } from "../slides/slides.service";
import { widgetsRepository } from "../widgets/widgets.repository";
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
  slide: {
    id: string;
    name: string;
    order: number;
    durationSeconds: number | null;
    isEnabled: boolean;
  } | null;
  widgets: DisplayLayoutWidgetEnvelope[];
}

function normalizeState(state: WidgetDataState): DisplayWidgetState {
  if (state === "stale") {
    return "loading";
  }

  return state;
}

export const displayService = {
  async getDisplayLayout(profileId: string, userId: string, slideId?: string): Promise<DisplayLayoutResponse> {
    const slide = await slidesService.getSlideForDisplay({
      profileId,
      slideId: slideId ?? null,
    });

    if (!slide) {
      return {
        slide: null,
        widgets: [],
      };
    }

    const widgets = await widgetsRepository.findAllBySlide({
      profileId,
      slideId: slide.id,
    });

    const resolvedWidgets = await Promise.all(widgets.map(async (widget) => {
      const resolvedAt = new Date().toISOString();
      const widgetType = widget.type as SupportedWidgetType;
      const plugin = getWidgetPlugin(widgetType);

      if (!plugin?.api?.resolveData) {
        return {
          widgetInstanceId: widget.id,
          widgetKey: widgetType,
          layout: widget.layout,
          state: "error" as const,
          config: {},
          configSchema: {} as WidgetConfigSchema,
          data: null,
          meta: {
            resolvedAt,
            errorCode: "UNSUPPORTED_WIDGET_TYPE",
            message: `Unsupported widget type: ${widget.type}`,
          },
        };
      }

      const normalizedConfig = normalizeWidgetConfig(widgetType, widget.config) as Record<string, unknown>;
      const configSchema = (plugin.configSchema ?? {}) as WidgetConfigSchema;
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
          userId,
        });

        return {
          // Use persisted widget identity to keep selection/render keys stable.
          widgetInstanceId: widget.id,
          widgetKey: widgetType,
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
      slide: {
        id: slide.id,
        name: slide.name,
        order: slide.order,
        durationSeconds: slide.durationSeconds,
        isEnabled: slide.isEnabled,
      },
      widgets: resolvedWidgets,
    };
  },
};
