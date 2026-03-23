import { Prisma } from "@prisma/client";
import { apiErrors } from "../../core/http/api-error";
import { createRealtimeEvent } from "../realtime/realtime.events";
import { publishRealtimeEvent } from "../realtime/realtime.runtime";
import { widgetsRepository } from "./widgets.repository";
import {
  defaultWidgetLayout,
  DISPLAY_GRID_BASE_ROWS,
  DISPLAY_GRID_COLUMNS,
  getDefaultWidgetConfig,
  getWidgetRegistryEntry,
  normalizeWidgetConfig,
  validateWidgetConfig,
  type SupportedWidgetType,
  widgetLayoutSchema,
} from "./widget-contracts";

export const widgetsService = {
  getProfileWidgets(profileId: string) {
    return widgetsRepository.findAll(profileId);
  },

  getWidgetById(id: string) {
    return widgetsRepository.findById(id);
  },

  getWidgetByIdForUser(id: string, userId: string) {
    return widgetsRepository.findByIdForUser(id, userId);
  },

  async createWidget(data: {
    profileId: string;
    type: SupportedWidgetType;
    config?: Prisma.InputJsonValue;
    layout?: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }) {
    const parsedLayout = widgetLayoutSchema.safeParse(data.layout ?? defaultWidgetLayout);

    if (!parsedLayout.success) {
      throw apiErrors.validation("Invalid widget layout", parsedLayout.error.format());
    }

    const createdWidget = await widgetsRepository.create({
      profileId: data.profileId,
      type: data.type,
      config:
        data.config === undefined
          ? getDefaultWidgetConfig(data.type)
          : normalizeWidgetConfig(data.type, data.config),
      layout: parsedLayout.data,
    });

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "widget.created",
        profileId: data.profileId,
        widgetId: createdWidget.id,
      }),
    );
    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: data.profileId,
        widgetId: createdWidget.id,
      }),
    );

    return createdWidget;
  },

  async createWidgetAtNextPosition(data: {
    profileId: string;
    type: SupportedWidgetType;
    config?: Prisma.InputJsonValue;
    layout?: {
      x: number;
      y: number;
      w: number;
      h: number;
    };
  }) {
    const widgets = await widgetsRepository.findAll(data.profileId);
    const parsedLayout = widgetLayoutSchema.safeParse(data.layout ?? defaultWidgetLayout);

    if (!parsedLayout.success) {
      throw apiErrors.validation("Invalid widget layout", parsedLayout.error.format());
    }

    const existingLayouts = widgets.map((widget) => widget.layout);
    let nextLayout = parsedLayout.data;

    const hasLayoutConflict = existingLayouts.some((layout) => layoutsOverlap(layout, nextLayout));
    if (hasLayoutConflict) {
      if (data.layout) {
        throw apiErrors.validation("Widget layout overlaps with an existing widget.");
      }

      const autoPlacedLayout = findFirstAvailableLayout(parsedLayout.data, existingLayouts);
      if (!autoPlacedLayout) {
        throw apiErrors.validation("No available layout slot for new widget.");
      }
      nextLayout = autoPlacedLayout;
    }

    return this.createWidget({
      profileId: data.profileId,
      type: data.type,
      config: data.config,
      layout: nextLayout,
    });
  },

  async updateWidgetsLayoutForProfile(data: {
    profileId: string;
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
      const updatedWidgets = await widgetsRepository.updateLayouts(data.profileId, parsedWidgets);

      publishRealtimeEvent(
        createRealtimeEvent({
          type: "layout.updated",
          profileId: data.profileId,
        }),
      );
      publishRealtimeEvent(
        createRealtimeEvent({
          type: "display.refreshRequested",
          profileId: data.profileId,
        }),
      );

      return updatedWidgets;
    } catch {
      throw apiErrors.notFound("One or more widgets were not found for this profile.");
    }
  },

  async updateWidgetConfigForProfile(data: {
    profileId: string;
    widgetId: string;
    configPatch: Record<string, unknown>;
  }) {
    const widget = await widgetsRepository.findById(data.widgetId);
    if (!widget || widget.profileId !== data.profileId) {
      return null;
    }

    const widgetType = widget.type as SupportedWidgetType;
    const defaultConfig = getDefaultWidgetConfig(widgetType) as Record<string, unknown>;
    const normalizedExistingConfig = normalizeWidgetConfig(widgetType, widget.config) as Record<string, unknown>;
    const nextConfig = {
      ...defaultConfig,
      ...normalizedExistingConfig,
      ...data.configPatch,
    };

    const validationResult = validateWidgetConfig(widgetType, nextConfig);
    if (!validationResult.success) {
      throw apiErrors.validation(
        `Invalid config for widget type ${getWidgetRegistryEntry(widgetType).manifest.name}`,
        validationResult.error.format(),
      );
    }

    const updatedWidget = await widgetsRepository.updateConfig({
      id: widget.id,
      profileId: data.profileId,
      config: validationResult.data as Prisma.InputJsonValue,
    });

    if (!updatedWidget) {
      return null;
    }

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "widget.updated",
        profileId: data.profileId,
        widgetId: updatedWidget.id,
      }),
    );
    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: data.profileId,
        widgetId: updatedWidget.id,
      }),
    );

    return updatedWidget;
  },

  async deleteWidgetForProfile(data: { profileId: string; widgetId: string }) {
    const deletedWidget = await widgetsRepository.deleteById({
      id: data.widgetId,
      profileId: data.profileId,
    });

    if (!deletedWidget) {
      return null;
    }

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "widget.deleted",
        profileId: data.profileId,
        widgetId: deletedWidget.id,
      }),
    );
    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: data.profileId,
        widgetId: deletedWidget.id,
      }),
    );

    return deletedWidget;
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

function findFirstAvailableLayout(
  proposedLayout: { x: number; y: number; w: number; h: number },
  occupiedLayouts: Array<{ x: number; y: number; w: number; h: number }>,
): { x: number; y: number; w: number; h: number } | null {
  const maxX = DISPLAY_GRID_COLUMNS - proposedLayout.w;
  const maxY = DISPLAY_GRID_BASE_ROWS - proposedLayout.h;

  for (let y = 0; y <= maxY; y += 1) {
    for (let x = 0; x <= maxX; x += 1) {
      const candidate = { ...proposedLayout, x, y };
      if (!occupiedLayouts.some((layout) => layoutsOverlap(layout, candidate))) {
        return candidate;
      }
    }
  }

  return null;
}
