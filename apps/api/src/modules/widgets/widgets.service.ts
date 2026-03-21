import { Prisma } from "@prisma/client";
import { apiErrors } from "../../core/http/api-error";
import { widgetsRepository } from "./widgets.repository";
import {
  defaultWidgetLayout,
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
};
