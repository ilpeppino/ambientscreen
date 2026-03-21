import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetsService } from "../src/modules/widgets/widgets.service";

const originalCreate = widgetsRepository.create;
const originalFindAll = widgetsRepository.findAll;
const originalUpdateLayouts = widgetsRepository.updateLayouts;

afterEach(() => {
  (widgetsRepository as unknown as { create: typeof widgetsRepository.create }).create =
    originalCreate;
  (widgetsRepository as unknown as { findAll: typeof widgetsRepository.findAll }).findAll =
    originalFindAll;
  (widgetsRepository as unknown as { updateLayouts: typeof widgetsRepository.updateLayouts }).updateLayouts =
    originalUpdateLayouts;
});

test("widgetsService createWidget validates layout", async () => {
  (widgetsRepository as unknown as { create: typeof widgetsRepository.create }).create = (async (
    input,
  ) => ({
    id: "widget-1",
    userId: input.userId,
    type: input.type,
    config: input.config,
    layout: input.layout,
    isActive: input.isActive,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  })) as typeof widgetsRepository.create;

  assert.throws(() =>
    widgetsService.createWidget({
      userId: "user-1",
      type: "clockDate",
      layout: { x: 0, y: 0, w: 0, h: 1 },
      isActive: true,
    }),
  );
});

test("widgetsService createWidgetAtNextPosition falls back to default layout", async () => {
  (widgetsRepository as unknown as { findAll: typeof widgetsRepository.findAll }).findAll =
    async () => [];

  (widgetsRepository as unknown as { create: typeof widgetsRepository.create }).create = (async (
    input,
  ) => ({
    id: "widget-1",
    userId: input.userId,
    type: input.type,
    config: input.config,
    layout: input.layout,
    isActive: input.isActive,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  })) as typeof widgetsRepository.create;

  const created = await widgetsService.createWidgetAtNextPosition({
    userId: "user-1",
    type: "clockDate",
  });

  assert.deepEqual(created.layout, { x: 0, y: 0, w: 1, h: 1 });
});

test("widgetsService updateWidgetsLayoutForUser validates layouts", async () => {
  await assert.rejects(
    widgetsService.updateWidgetsLayoutForUser({
      userId: "user-1",
      widgets: [
        {
          id: "widget-1",
          layout: { x: 11, y: 0, w: 2, h: 1 },
        },
      ],
    }),
  );
});

test("widgetsService updateWidgetsLayoutForUser rejects overlapping layouts", async () => {
  await assert.rejects(
    widgetsService.updateWidgetsLayoutForUser({
      userId: "user-1",
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
  );
});

test("widgetsService updateWidgetsLayoutForUser persists validated payload", async () => {
  let receivedInput: unknown;

  (widgetsRepository as unknown as { updateLayouts: typeof widgetsRepository.updateLayouts }).updateLayouts = (async (
    userId,
    input,
  ) => {
    receivedInput = { userId, input };
    return input.map((item) => ({
      id: item.id,
      userId,
      type: "clockDate",
      config: {},
      layout: item.layout,
      isActive: true,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    }));
  }) as typeof widgetsRepository.updateLayouts;

  const updated = await widgetsService.updateWidgetsLayoutForUser({
    userId: "user-1",
    widgets: [
      {
        id: "widget-1",
        layout: { x: 2, y: 1, w: 4, h: 2 },
      },
    ],
  });

  assert.equal(updated.length, 1);
  assert.deepEqual(updated[0].layout, { x: 2, y: 1, w: 4, h: 2 });
  assert.deepEqual(receivedInput, {
    userId: "user-1",
    input: [
      {
        id: "widget-1",
        layout: { x: 2, y: 1, w: 4, h: 2 },
      },
    ],
  });
});
