import { prisma } from "../../core/db/prisma";

export interface SlideRecord {
  id: string;
  profileId: string;
  name: string;
  order: number;
  durationSeconds: number | null;
  isEnabled: boolean;
  createdAt: Date;
  updatedAt: Date;
  itemCount: number;
}

function mapSlideRecord(
  slide: {
    id: string;
    profileId: string;
    name: string;
    order: number;
    durationSeconds: number | null;
    isEnabled: boolean;
    createdAt: Date;
    updatedAt: Date;
    _count?: { slideItems: number };
  },
): SlideRecord {
  return {
    id: slide.id,
    profileId: slide.profileId,
    name: slide.name,
    order: slide.order,
    durationSeconds: slide.durationSeconds,
    isEnabled: slide.isEnabled,
    createdAt: slide.createdAt,
    updatedAt: slide.updatedAt,
    itemCount: slide._count?.slideItems ?? 0,
  };
}

export const slidesRepository = {
  async findAllByProfile(profileId: string): Promise<SlideRecord[]> {
    const slides = await prisma.slide.findMany({
      where: { profileId },
      include: {
        _count: {
          select: {
            slideItems: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return slides.map(mapSlideRecord);
  },

  async findByIdForProfile(input: { profileId: string; slideId: string }): Promise<SlideRecord | null> {
    const slide = await prisma.slide.findFirst({
      where: {
        id: input.slideId,
        profileId: input.profileId,
      },
      include: {
        _count: {
          select: {
            slideItems: true,
          },
        },
      },
    });

    return slide ? mapSlideRecord(slide) : null;
  },

  async findFirstForProfile(profileId: string): Promise<SlideRecord | null> {
    const slide = await prisma.slide.findFirst({
      where: { profileId },
      include: {
        _count: {
          select: {
            slideItems: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return slide ? mapSlideRecord(slide) : null;
  },

  async findFirstEnabledForProfile(profileId: string): Promise<SlideRecord | null> {
    const slide = await prisma.slide.findFirst({
      where: {
        profileId,
        isEnabled: true,
      },
      include: {
        _count: {
          select: {
            slideItems: true,
          },
        },
      },
      orderBy: [{ order: "asc" }, { createdAt: "asc" }],
    });

    return slide ? mapSlideRecord(slide) : null;
  },

  async create(input: {
    profileId: string;
    name: string;
    durationSeconds: number | null;
    isEnabled: boolean;
    order: number;
  }): Promise<SlideRecord> {
    const created = await prisma.slide.create({
      data: {
        profileId: input.profileId,
        name: input.name,
        durationSeconds: input.durationSeconds,
        isEnabled: input.isEnabled,
        order: input.order,
      },
      include: {
        _count: {
          select: {
            slideItems: true,
          },
        },
      },
    });

    return mapSlideRecord(created);
  },

  async update(input: {
    profileId: string;
    slideId: string;
    name?: string;
    durationSeconds?: number | null;
    isEnabled?: boolean;
  }): Promise<SlideRecord | null> {
    const updateResult = await prisma.slide.updateMany({
      where: {
        id: input.slideId,
        profileId: input.profileId,
      },
      data: {
        ...(input.name !== undefined ? { name: input.name } : {}),
        ...(input.durationSeconds !== undefined ? { durationSeconds: input.durationSeconds } : {}),
        ...(input.isEnabled !== undefined ? { isEnabled: input.isEnabled } : {}),
      },
    });

    if (updateResult.count !== 1) {
      return null;
    }

    return this.findByIdForProfile({
      profileId: input.profileId,
      slideId: input.slideId,
    });
  },

  async moveItemsToSlide(input: { fromSlideId: string; toSlideId: string }) {
    await prisma.slideItem.updateMany({
      where: { slideId: input.fromSlideId },
      data: { slideId: input.toSlideId },
    });
  },

  async deleteByIdForProfile(input: { profileId: string; slideId: string }) {
    return prisma.slide.deleteMany({
      where: {
        id: input.slideId,
        profileId: input.profileId,
      },
    });
  },

  async applyOrder(profileId: string, orderedSlideIds: string[]): Promise<void> {
    await prisma.$transaction(async (transaction) => {
      for (let index = 0; index < orderedSlideIds.length; index += 1) {
        await transaction.slide.update({
          where: { id: orderedSlideIds[index] },
          data: { order: index },
        });
      }
    });
  },
};
