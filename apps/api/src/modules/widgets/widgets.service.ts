import { Prisma } from "@prisma/client";
import { widgetsRepository } from "./widgets.repository";

export const SUPPORTED_WIDGET_TYPES = ["clockDate", "weather", "calendar"] as const;
export type SupportedWidgetType = (typeof SUPPORTED_WIDGET_TYPES)[number];

function getDefaultWidgetConfig(
  _widgetType: SupportedWidgetType,
): Prisma.InputJsonValue {
  return {};
}

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
    position?: number;
    isActive: boolean;
  }) {
    return widgetsRepository.create({
      userId: data.userId,
      type: data.type,
      config: data.config ?? getDefaultWidgetConfig(data.type),
      position: data.position ?? 0,
      isActive: data.isActive
    });
  },

  async createWidgetAtNextPosition(data: {
    userId: string;
    type: SupportedWidgetType;
    config?: Prisma.InputJsonValue;
  }) {
    const widgets = await widgetsRepository.findAll(data.userId);
    const nextPosition = widgets.length === 0 ? 0 : widgets[widgets.length - 1].position + 1;
    const hasActiveWidget = widgets.some((widget) => widget.isActive);

    return this.createWidget({
      userId: data.userId,
      type: data.type,
      config: data.config,
      position: nextPosition,
      isActive: !hasActiveWidget
    });
  },

  async activateWidgetForUser(data: { userId: string; widgetId: string }) {
    const widget = await widgetsRepository.findById(data.widgetId);

    if (!widget || widget.userId !== data.userId) {
      return null;
    }

    return widgetsRepository.activateWidget(data.userId, data.widgetId);
  }
};
