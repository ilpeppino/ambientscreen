import { beforeEach, afterEach, expect, test, vi } from "vitest";
import { slidesService } from "../src/modules/slides/slides.service";
import { slidesRepository } from "../src/modules/slides/slides.repository";

beforeEach(() => {
  vi.spyOn(slidesRepository, "findAllByProfile").mockResolvedValue([
    {
      id: "slide-1",
      profileId: "profile-1",
      name: "Default",
      order: 0,
      durationSeconds: null,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      itemCount: 1,
    },
    {
      id: "slide-2",
      profileId: "profile-1",
      name: "Secondary",
      order: 1,
      durationSeconds: 15,
      isEnabled: true,
      createdAt: new Date(),
      updatedAt: new Date(),
      itemCount: 0,
    },
  ] as never);

  vi.spyOn(slidesRepository, "findByIdForProfile").mockImplementation(async ({ slideId }) => {
    if (slideId === "slide-1") {
      return {
        id: "slide-1",
        profileId: "profile-1",
        name: "Default",
        order: 0,
        durationSeconds: null,
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        itemCount: 1,
      } as never;
    }

    if (slideId === "slide-2") {
      return {
        id: "slide-2",
        profileId: "profile-1",
        name: "Secondary",
        order: 1,
        durationSeconds: 15,
        isEnabled: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        itemCount: 0,
      } as never;
    }

    return null as never;
  });

  vi.spyOn(slidesRepository, "findFirstEnabledForProfile").mockResolvedValue({
    id: "slide-1",
    profileId: "profile-1",
    name: "Default",
    order: 0,
    durationSeconds: null,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    itemCount: 1,
  } as never);
});

afterEach(() => {
  vi.restoreAllMocks();
});

test("updateSlide reorders slides when order is provided", async () => {
  vi.spyOn(slidesRepository, "applyOrder").mockResolvedValue(undefined);
  vi.spyOn(slidesRepository, "update").mockResolvedValue({
    id: "slide-1",
    profileId: "profile-1",
    name: "Default",
    order: 1,
    durationSeconds: null,
    isEnabled: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    itemCount: 1,
  } as never);

  await slidesService.updateSlide({
    profileId: "profile-1",
    slideId: "slide-1",
    order: 1,
  });

  expect(slidesRepository.applyOrder).toHaveBeenCalledWith("profile-1", ["slide-2", "slide-1"]);
});

test("deleteSlide moves items to fallback slide before deleting", async () => {
  vi.spyOn(slidesRepository, "moveItemsToSlide").mockResolvedValue(undefined);
  vi.spyOn(slidesRepository, "deleteByIdForProfile").mockResolvedValue({ count: 1 } as never);
  vi.spyOn(slidesRepository, "applyOrder").mockResolvedValue(undefined);

  const result = await slidesService.deleteSlide({
    profileId: "profile-1",
    slideId: "slide-1",
  });

  expect(result).toEqual({ deleted: true });
  expect(slidesRepository.moveItemsToSlide).toHaveBeenCalledWith({
    fromSlideId: "slide-1",
    toSlideId: "slide-2",
  });
});
