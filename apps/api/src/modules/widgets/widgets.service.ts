import { Prisma } from "@prisma/client";
import { apiErrors } from "../../core/http/api-error";
import { widgetsRepository } from "./widgets.repository";
import {
  defaultWidgetLayout,
  DISPLAY_GRID_COLUMNS,
  getDefaultWidgetConfig,
  normalizeWidgetConfig,
  type SupportedWidgetType,
  widgetLayoutSchema,
} from "./widget-contracts";

export const widgetsService = {
  getUserWidgets(userId: string) {
    return widgetsRepository.findAll(userId);
  },

  getWidgetById(id: string) {
    return widgetsRepository.findById(id);
  },

  createWidget(data: {
    userId: string;
    type: SupportedWidgetType;
    config?: Prisma.InputJsonValue;
    layout?: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
    isActive: boolean;
  }) {
    const parsedLayout = widgetLayoutSchema.safeParse(data.layout ?? defaultWidgetLayout);

    if (!parsedLayout.success) {
      throw apiErrors.validation("Invalid widget layout", parsedLayout.error.format());
    }

    return widgetsRepository.create({
      userId: data.userId,
      type: data.type,
      config:
        data.config === undefined
          ? getDefaultWidgetConfig(data.type)
          : normalizeWidgetConfig(data.type, data.config),
      layout: parsedLayout.data,
      isActive: data.isActive,
    });
  },

  async createWidgetAtNextPosition(data: {
    userId: string;
    type: SupportedWidgetType;
    config?: Prisma.InputJsonValue;
    layout?: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }) {
    const widgets = await widgetsRepository.findAll(data.userId);
    const hasActiveWidget = widgets.some((widget) => widget.isActive);

    return this.createWidget({
      userId: data.userId,
      type: data.type,
      config: data.config,
      layout: data.layout ?? defaultWidgetLayout,
      isActive: !hasActiveWidget,
    });
  },

  async activateWidgetForUser(data: { userId: string; widgetId: string }) {
    const widget = await widgetsRepository.findById(data.widgetId);

    if (!widget || widget.userId !== data.userId) {
      return null;
    }

    return widgetsRepository.activateWidget(data.userId, data.widgetId);
  },

  async updateWidgetsLayoutForUser(data: {
    userId: string;
    widgets: Array<{
      id: string;
      layout: {
        x: number;
        y: number;
        w: number;
        h: number;
      };
    }>;
  }) {
    const seenIds = new Set<string>();
    const parsedWidgets = data.widgets.map((widget) => {
      if (seenIds.has(widget.id)) {
        throw apiErrors.validation("Duplicate widget id in layout payload");
      }
      seenIds.add(widget.id);

      const parsedLayout = widgetLayoutSchema.safeParse(widget.layout);
      if (!parsedLayout.success) {
        throw apiErrors.validation("Invalid widget layout", parsedLayout.error.format());
      }

      if (parsedLayout.data.x + parsedLayout.data.w > DISPLAY_GRID_COLUMNS) {
        throw apiErrors.validation(`Widget layout exceeds ${DISPLAY_GRID_COLUMNS} columns`);
      }

      return {
        id: widget.id,
        layout: parsedLayout.data,
      };
    });

    for (let index = 0; index < parsedWidgets.length; index += 1) {
      for (let candidateIndex = index + 1; candidateIndex < parsedWidgets.length; candidateIndex += 1) {
        if (layoutsOverlap(parsedWidgets[index].layout, parsedWidgets[candidateIndex].layout)) {
          throw apiErrors.validation("Widget layouts must not overlap.");
        }
      }
    }

    try {
      return await widgetsRepository.updateLayouts(data.userId, parsedWidgets);
    } catch {
      throw apiErrors.notFound("One or more widgets were not found for this user.");
    }
  },
};

function layoutsOverlap(
  first: { x: number; y: number; w: number; h: number },
  second: { x: number; y: number; w: number; h: number },
) {
  const xOverlap = first.x < second.x + second.w && second.x < first.x + first.w;
  const yOverlap = first.y < second.y + second.h && second.y < first.y + first.h;

  return xOverlap && yOverlap;
}
