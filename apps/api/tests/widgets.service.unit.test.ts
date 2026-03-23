import { test, expect, afterEach, vi } from "vitest";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetsService } from "../src/modules/widgets/widgets.service";

afterEach(() => {
  vi.restoreAllMocks();
});

test("widgetsService createWidget validates layout", async () => {
  vi.spyOn(widgetsRepository, "create").mockImplementation((async (
    input,
  ) => ({
    id: "widget-1",
    profileId: input.profileId,
    type: input.type,
    config: input.config,
    layout: input.layout,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  })) as never);

  await expect(async () =>
    widgetsService.createWidget({
      profileId: "user-1",
      type: "clockDate",
      layout: { x: 0, y: 0, w: 0, h: 1 },
    }),
  ).rejects.toThrow();
});

test("widgetsService createWidgetAtNextPosition falls back to default layout", async () => {
  vi.spyOn(widgetsRepository, "findAll").mockImplementation(async () => [] as never);

  vi.spyOn(widgetsRepository, "create").mockImplementation((async (
    input,
  ) => ({
    id: "widget-1",
    profileId: input.profileId,
    type: input.type,
    config: input.config,
    layout: input.layout,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  })) as never);

  const created = await widgetsService.createWidgetAtNextPosition({
    profileId: "user-1",
    type: "clockDate",
  });

  expect(created.layout).toEqual({ x: 0, y: 0, w: 1, h: 1 });
});

test("widgetsService createWidgetAtNextPosition auto-places when default slot is occupied", async () => {
  vi.spyOn(widgetsRepository, "findAll").mockImplementation(
    async () => [
      {
        id: "widget-existing",
        profileId: "user-1",
        type: "clockDate",
        config: {},
        layout: { x: 0, y: 0, w: 1, h: 1 },
        createdAt: new Date("2026-03-21T10:00:00.000Z"),
        updatedAt: new Date("2026-03-21T10:00:00.000Z"),
      },
    ] as never,
  );

  vi.spyOn(widgetsRepository, "create").mockImplementation((async (
    input,
  ) => ({
    id: "widget-new",
    profileId: input.profileId,
    type: input.type,
    config: input.config,
    layout: input.layout,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  })) as never);

  const created = await widgetsService.createWidgetAtNextPosition({
    profileId: "user-1",
    type: "weather",
  });

  expect(created.layout).toEqual({ x: 1, y: 0, w: 1, h: 1 });
});

test("widgetsService createWidgetAtNextPosition rejects explicit overlapping layout", async () => {
  vi.spyOn(widgetsRepository, "findAll").mockImplementation(
    async () => [
      {
        id: "widget-existing",
        profileId: "user-1",
        type: "clockDate",
        config: {},
        layout: { x: 0, y: 0, w: 4, h: 2 },
        createdAt: new Date("2026-03-21T10:00:00.000Z"),
        updatedAt: new Date("2026-03-21T10:00:00.000Z"),
      },
    ] as never,
  );

  await expect(
    widgetsService.createWidgetAtNextPosition({
      profileId: "user-1",
      type: "weather",
      layout: { x: 2, y: 0, w: 4, h: 2 },
    }),
  ).rejects.toThrow();
});

test("widgetsService updateWidgetsLayoutForProfile validates layouts", async () => {
  await expect(
    widgetsService.updateWidgetsLayoutForProfile({
      profileId: "user-1",
      widgets: [
        {
          id: "widget-1",
          layout: { x: 11, y: 0, w: 2, h: 1 },
        },
      ],
    }),
  ).rejects.toThrow();
});

test("widgetsService updateWidgetsLayoutForProfile rejects overlapping layouts", async () => {
  await expect(
    widgetsService.updateWidgetsLayoutForProfile({
      profileId: "user-1",
      widgets: [
        {
          id: "widget-1",
          layout: { x: 0, y: 0, w: 6, h: 3 },
        },
        {
          id: "widget-2",
          layout: { x: 5, y: 0, w: 6, h: 3 },
        },
      ],
    }),
  ).rejects.toThrow();
});

test("widgetsService updateWidgetsLayoutForProfile persists validated payload", async () => {
  let receivedInput: unknown;

  vi.spyOn(widgetsRepository, "updateLayouts").mockImplementation((async (
    profileId,
    input,
  ) => {
    receivedInput = { profileId, input };
    return input.map((item) => ({
      id: item.id,
      profileId,
      type: "clockDate",
      config: {},
      layout: item.layout,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    }));
  }) as never);

  const updated = await widgetsService.updateWidgetsLayoutForProfile({
    profileId: "user-1",
    widgets: [
      {
        id: "widget-1",
        layout: { x: 2, y: 1, w: 4, h: 2 },
      },
    ],
  });

  expect(updated.length).toBe(1);
  expect(updated[0].layout).toEqual({ x: 2, y: 1, w: 4, h: 2 });
  expect(receivedInput).toEqual({
    profileId: "user-1",
    input: [
      {
        id: "widget-1",
        layout: { x: 2, y: 1, w: 4, h: 2 },
      },
    ],
  });
});

test("widgetsService clearWidgetsForProfile deletes all widgets in a profile", async () => {
  vi.spyOn(widgetsRepository, "deleteAllByProfileId").mockResolvedValue(4 as never);

  const result = await widgetsService.clearWidgetsForProfile({
    profileId: "profile-1",
  });

  expect(widgetsRepository.deleteAllByProfileId).toHaveBeenCalledWith("profile-1");
  expect(result).toEqual({ deletedCount: 4 });
});
