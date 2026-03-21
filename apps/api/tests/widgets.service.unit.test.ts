import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetsService } from "../src/modules/widgets/widgets.service";

const originalCreate = widgetsRepository.create;
const originalFindAll = widgetsRepository.findAll;

afterEach(() => {
  (widgetsRepository as unknown as { create: typeof widgetsRepository.create }).create =
    originalCreate;
  (widgetsRepository as unknown as { findAll: typeof widgetsRepository.findAll }).findAll =
    originalFindAll;
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
