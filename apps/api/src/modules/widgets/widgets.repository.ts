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
  profileId: string;
  type: string;
  config: Prisma.JsonValue;
  layout: WidgetLayout;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

interface CreateWidgetInput {
  profileId: string;
  type: string;
  config: Prisma.InputJsonValue;
  layout: WidgetLayout;
  isActive: boolean;
}

interface UpdateWidgetLayoutInput {
  id: string;
  layout: WidgetLayout;
}

interface UpdateWidgetConfigInput {
  id: string;
  profileId: string;
  config: Prisma.InputJsonValue;
}

interface DeleteWidgetInput {
  id: string;
  profileId: string;
}

function mapWidgetRecord(widget: {
  id: string;
  profileId: string;
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
    profileId: widget.profileId,
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
  async findAll(profileId: string): Promise<WidgetRecord[]> {
    const widgets = await prisma.widgetInstance.findMany({
      where: { profileId },
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
        profileId: input.profileId,
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

  async activateWidget(profileId: string, widgetId: string): Promise<WidgetRecord> {
    return prisma.$transaction(async (transaction) => {
      await transaction.widgetInstance.updateMany({
        where: { profileId },
        data: { isActive: false },
      });

      const widget = await transaction.widgetInstance.update({
        where: { id: widgetId },
        data: { isActive: true },
      });

      return mapWidgetRecord(widget);
    });
  },

  async updateLayouts(profileId: string, inputs: UpdateWidgetLayoutInput[]): Promise<WidgetRecord[]> {
    await prisma.$transaction(async (transaction) => {
      for (const input of inputs) {
        const updateResult = await transaction.widgetInstance.updateMany({
          where: {
            id: input.id,
            profileId,
          },
          data: {
            layoutX: input.layout.x,
            layoutY: input.layout.y,
            layoutW: input.layout.w,
            layoutH: input.layout.h,
          },
        });

        if (updateResult.count !== 1) {
          throw new Error(`Widget not found for profile: ${input.id}`);
        }
      }
    });

    const widgets = await prisma.widgetInstance.findMany({
      where: {
        id: {
          in: inputs.map((input) => input.id),
        },
        profileId,
      },
    });

    return widgets.map(mapWidgetRecord);
  },

  async updateConfig(input: UpdateWidgetConfigInput): Promise<WidgetRecord | null> {
    const updateResult = await prisma.widgetInstance.updateMany({
      where: {
        id: input.id,
        profileId: input.profileId,
      },
      data: {
        config: input.config,
      },
    });

    if (updateResult.count !== 1) {
      return null;
    }

    const widget = await prisma.widgetInstance.findUnique({
      where: { id: input.id },
    });

    return widget ? mapWidgetRecord(widget) : null;
  },

  async deleteById(input: DeleteWidgetInput): Promise<WidgetRecord | null> {
    const widget = await prisma.widgetInstance.findFirst({
      where: {
        id: input.id,
        profileId: input.profileId,
      },
    });

    if (!widget) {
      return null;
    }

    await prisma.widgetInstance.delete({
      where: { id: widget.id },
    });

    return mapWidgetRecord(widget);
  },
};
