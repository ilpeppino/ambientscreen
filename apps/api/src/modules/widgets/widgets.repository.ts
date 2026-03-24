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
  createdAt: Date;
  updatedAt: Date;
}

interface CreateWidgetInput {
  profileId: string;
  type: string;
  config: Prisma.InputJsonValue;
  layout: WidgetLayout;
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

type WidgetInstanceWithSlideItem = {
  id: string;
  profileId: string;
  type: string;
  config: Prisma.JsonValue;
  layoutX: number;
  layoutY: number;
  layoutW: number;
  layoutH: number;
  createdAt: Date;
  updatedAt: Date;
  slideItem: { layoutX: number; layoutY: number; layoutW: number; layoutH: number } | null;
};

function mapWidgetRecord(widget: WidgetInstanceWithSlideItem): WidgetRecord {
  // Prefer SlideItem layout (authoritative source); fall back to WidgetInstance fields
  // during any transition window where a SlideItem might not yet exist.
  const src = widget.slideItem ?? {
    layoutX: widget.layoutX,
    layoutY: widget.layoutY,
    layoutW: widget.layoutW,
    layoutH: widget.layoutH,
  };

  return {
    id: widget.id,
    profileId: widget.profileId,
    type: widget.type,
    config: widget.config,
    layout: {
      x: src.layoutX,
      y: src.layoutY,
      w: src.layoutW,
      h: src.layoutH,
    },
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt,
  };
}

export const widgetsRepository = {
  async findAll(profileId: string): Promise<WidgetRecord[]> {
    const widgets = await prisma.widgetInstance.findMany({
      where: { profileId },
      include: { slideItem: true },
      orderBy: [{ layoutY: "asc" }, { layoutX: "asc" }, { createdAt: "asc" }],
    });

    return widgets.map(mapWidgetRecord);
  },

  async findById(id: string): Promise<WidgetRecord | null> {
    const widget = await prisma.widgetInstance.findUnique({
      where: { id },
      include: { slideItem: true },
    });

    return widget ? mapWidgetRecord(widget) : null;
  },

  async findByIdForUser(id: string, userId: string): Promise<WidgetRecord | null> {
    const widget = await prisma.widgetInstance.findFirst({
      where: {
        id,
        profile: { userId },
      },
      include: { slideItem: true },
    });

    return widget ? mapWidgetRecord(widget) : null;
  },

  async create(input: CreateWidgetInput): Promise<WidgetRecord> {
    const widget = await prisma.$transaction(async (tx) => {
      const created = await tx.widgetInstance.create({
        data: {
          profileId: input.profileId,
          type: input.type,
          config: input.config,
          layoutX: input.layout.x,
          layoutY: input.layout.y,
          layoutW: input.layout.w,
          layoutH: input.layout.h,
        },
      });

      // Attach to the profile's default slide (lowest order).
      const defaultSlide = await tx.slide.findFirst({
        where: { profileId: input.profileId },
        orderBy: { order: "asc" },
      });

      if (defaultSlide) {
        await tx.slideItem.create({
          data: {
            slideId: defaultSlide.id,
            widgetInstanceId: created.id,
            layoutX: input.layout.x,
            layoutY: input.layout.y,
            layoutW: input.layout.w,
            layoutH: input.layout.h,
          },
        });
      }

      return created;
    });

    // Re-fetch with SlideItem included so the returned record uses the authoritative layout source.
    const withSlideItem = await prisma.widgetInstance.findUniqueOrThrow({
      where: { id: widget.id },
      include: { slideItem: true },
    });

    return mapWidgetRecord(withSlideItem);
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

        // Keep SlideItem layout in sync.
        await transaction.slideItem.updateMany({
          where: { widgetInstanceId: input.id },
          data: {
            layoutX: input.layout.x,
            layoutY: input.layout.y,
            layoutW: input.layout.w,
            layoutH: input.layout.h,
          },
        });
      }
    });

    const widgets = await prisma.widgetInstance.findMany({
      where: {
        id: { in: inputs.map((input) => input.id) },
        profileId,
      },
      include: { slideItem: true },
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
      include: { slideItem: true },
    });

    return widget ? mapWidgetRecord(widget) : null;
  },

  async deleteById(input: DeleteWidgetInput): Promise<WidgetRecord | null> {
    const widget = await prisma.widgetInstance.findFirst({
      where: {
        id: input.id,
        profileId: input.profileId,
      },
      include: { slideItem: true },
    });

    if (!widget) {
      return null;
    }

    await prisma.widgetInstance.delete({
      where: { id: widget.id },
    });

    return mapWidgetRecord(widget);
  },

  async deleteAllByProfileId(profileId: string): Promise<number> {
    const result = await prisma.widgetInstance.deleteMany({
      where: { profileId },
    });

    return result.count;
  },
};
