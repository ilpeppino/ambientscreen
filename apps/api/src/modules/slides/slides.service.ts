import { apiErrors } from "../../core/http/api-error";
import { createRealtimeEvent } from "../realtime/realtime.events";
import { publishRealtimeEvent } from "../realtime/realtime.runtime";
import { slidesRepository } from "./slides.repository";

export const slidesService = {
  listSlides(profileId: string) {
    return slidesRepository.findAllByProfile(profileId);
  },

  async getSlideForDisplay(input: { profileId: string; slideId?: string | null }) {
    if (input.slideId) {
      return slidesRepository.findByIdForProfile({
        profileId: input.profileId,
        slideId: input.slideId,
      });
    }

    const firstEnabled = await slidesRepository.findFirstEnabledForProfile(input.profileId);
    if (firstEnabled) {
      return firstEnabled;
    }

    return slidesRepository.findFirstForProfile(input.profileId);
  },

  async createSlide(input: {
    profileId: string;
    name: string;
    durationSeconds: number | null;
    isEnabled: boolean;
  }) {
    const currentSlides = await slidesRepository.findAllByProfile(input.profileId);
    const created = await slidesRepository.create({
      profileId: input.profileId,
      name: input.name,
      durationSeconds: input.durationSeconds,
      isEnabled: input.isEnabled,
      order: currentSlides.length,
    });

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: input.profileId,
      }),
    );

    return created;
  },

  async updateSlide(input: {
    profileId: string;
    slideId: string;
    name?: string;
    durationSeconds?: number | null;
    isEnabled?: boolean;
    order?: number;
  }) {
    const existingSlide = await slidesRepository.findByIdForProfile({
      profileId: input.profileId,
      slideId: input.slideId,
    });

    if (!existingSlide) {
      return null;
    }

    if (input.order !== undefined) {
      const slides = await slidesRepository.findAllByProfile(input.profileId);
      const withoutCurrent = slides.filter((slide) => slide.id !== input.slideId);
      const clampedTargetOrder = Math.max(0, Math.min(input.order, withoutCurrent.length));
      const reorderedIds = [
        ...withoutCurrent.slice(0, clampedTargetOrder).map((slide) => slide.id),
        input.slideId,
        ...withoutCurrent.slice(clampedTargetOrder).map((slide) => slide.id),
      ];

      await slidesRepository.applyOrder(input.profileId, reorderedIds);
    }

    const updated = await slidesRepository.update({
      profileId: input.profileId,
      slideId: input.slideId,
      name: input.name,
      durationSeconds: input.durationSeconds,
      isEnabled: input.isEnabled,
    });

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: input.profileId,
      }),
    );

    return updated;
  },

  async deleteSlide(input: { profileId: string; slideId: string }) {
    const existingSlide = await slidesRepository.findByIdForProfile({
      profileId: input.profileId,
      slideId: input.slideId,
    });

    if (!existingSlide) {
      return { deleted: false as const, reason: "notFound" as const };
    }

    const slides = await slidesRepository.findAllByProfile(input.profileId);
    if (slides.length <= 1) {
      return { deleted: false as const, reason: "lastSlide" as const };
    }

    const fallbackSlide = slides.find((slide) => slide.id !== input.slideId);
    if (!fallbackSlide) {
      return { deleted: false as const, reason: "lastSlide" as const };
    }

    await slidesRepository.moveItemsToSlide({
      fromSlideId: input.slideId,
      toSlideId: fallbackSlide.id,
    });
    await slidesRepository.deleteByIdForProfile({
      profileId: input.profileId,
      slideId: input.slideId,
    });

    const remainingSlides = await slidesRepository.findAllByProfile(input.profileId);
    await slidesRepository.applyOrder(
      input.profileId,
      remainingSlides.map((slide) => slide.id),
    );

    publishRealtimeEvent(
      createRealtimeEvent({
        type: "display.refreshRequested",
        profileId: input.profileId,
      }),
    );

    return { deleted: true as const };
  },

  async requireSlideForDisplay(input: { profileId: string; slideId?: string | null }) {
    const slide = await this.getSlideForDisplay(input);
    if (!slide) {
      throw apiErrors.notFound("Slide not found");
    }

    return slide;
  },
};
