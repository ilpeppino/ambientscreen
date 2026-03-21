import assert from "node:assert/strict";
import test, { afterEach } from "node:test";
import { prisma } from "../src/core/db/prisma";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";

const originalFindMany = prisma.widgetInstance.findMany;
const originalCreate = prisma.widgetInstance.create;

afterEach(() => {
  prisma.widgetInstance.findMany = originalFindMany;
  prisma.widgetInstance.create = originalCreate;
});

test("widgetsRepository maps db layout fields to layout object on list", async () => {
  prisma.widgetInstance.findMany = (async () => [
    {
      id: "widget-1",
      userId: "user-1",
      type: "clockDate",
      config: {},
      layoutX: 2,
      layoutY: 3,
      layoutW: 4,
      layoutH: 5,
      isActive: true,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ]) as typeof prisma.widgetInstance.findMany;

  const widgets = await widgetsRepository.findAll("user-1");
  assert.equal(widgets.length, 1);
  assert.deepEqual(widgets[0].layout, { x: 2, y: 3, w: 4, h: 5 });
});

test("widgetsRepository maps layout input to db layout fields on create", async () => {
  let createArgs: unknown;

  prisma.widgetInstance.create = (async (args) => {
    createArgs = args;
    return {
      id: "widget-1",
      userId: "user-1",
      type: "clockDate",
      config: {},
      layoutX: 1,
      layoutY: 2,
      layoutW: 3,
      layoutH: 4,
      isActive: true,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    };
  }) as typeof prisma.widgetInstance.create;

  const created = await widgetsRepository.create({
    userId: "user-1",
    type: "clockDate",
    config: {},
    layout: { x: 1, y: 2, w: 3, h: 4 },
    isActive: true,
  });

  assert.deepEqual(created.layout, { x: 1, y: 2, w: 3, h: 4 });
  assert.deepEqual(createArgs, {
    data: {
      userId: "user-1",
      type: "clockDate",
      config: {},
      layoutX: 1,
      layoutY: 2,
      layoutW: 3,
      layoutH: 4,
      isActive: true,
    },
  });
});
