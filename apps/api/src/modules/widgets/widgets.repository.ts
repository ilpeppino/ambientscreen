import { Prisma } from "@prisma/client";
import { prisma } from "../../core/db/prisma";

export interface WidgetLayout {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface WidgetRecord {
  id: string;
  userId: string;
  type: string;
  config: Prisma.JsonValue;
  layout: WidgetLayout;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateWidgetInput {
  userId: string;
  type: string;
  config: Prisma.InputJsonValue;
  layout: WidgetLayout;
  isActive: boolean;
}

function mapWidgetRecord(widget: {
  id: string;
  userId: string;
  type: string;
  config: Prisma.JsonValue;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}): WidgetRecord {
  return {
    id: widget.id,
    userId: widget.userId,
    type: widget.type,
    config: widget.config,
    layout: {
      x: widget.layoutX,
      y: widget.layoutY,
      w: widget.layoutW,
      h: widget.layoutH,
    },
    isActive: widget.isActive,
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt,
  };
}

export const widgetsRepository = {
  async findAll(userId: string): Promise<WidgetRecord[]> {
    const widgets = await prisma.widgetInstance.findMany({
      where: { userId },
      orderBy: [{ layoutY: "asc" }, { layoutX: "asc" }, { createdAt: "asc" }],
    });

    return widgets.map(mapWidgetRecord);
  },

  async findById(id: string): Promise<WidgetRecord | null> {
    const widget = await prisma.widgetInstance.findUnique({
      where: { id },
    });

    return widget ? mapWidgetRecord(widget) : null;
  },

  async create(input: CreateWidgetInput): Promise<WidgetRecord> {
    const widget = await prisma.widgetInstance.create({
      data: {
        userId: input.userId,
        type: input.type,
        config: input.config,
        layoutX: input.layout.x,
        layoutY: input.layout.y,
        layoutW: input.layout.w,
        layoutH: input.layout.h,
        isActive: input.isActive,
      },
    });

    return mapWidgetRecord(widget);
  },

  async activateWidget(userId: string, widgetId: string): Promise<WidgetRecord> {
    return prisma.$transaction(async (transaction) => {
      await transaction.widgetInstance.updateMany({
        where: { userId },
        data: { isActive: false },
      });

      const widget = await transaction.widgetInstance.update({
        where: { id: widgetId },
        data: { isActive: true },
      });

      return mapWidgetRecord(widget);
    });
  },
};
