import { test, expect, afterEach, vi } from "vitest";
import { prisma } from "../src/core/db/prisma";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";

afterEach(() => {
  vi.restoreAllMocks();
});

test("widgetsRepository maps db layout fields to layout object on list", async () => {
  vi.spyOn(prisma.widgetInstance, "findMany").mockImplementation((async () => [
    {
      id: "widget-1",
      profileId: "user-1",
      type: "clockDate",
      config: {},
      layoutX: 2,
      layoutY: 3,
      layoutW: 4,
      layoutH: 5,
      slideItem: null,
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ]) as never);

  const widgets = await widgetsRepository.findAll("user-1");
  expect(widgets.length).toBe(1);
  expect(widgets[0].layout).toEqual({ x: 2, y: 3, w: 4, h: 5 });
});

test("widgetsRepository prefers SlideItem layout over WidgetInstance layout on list", async () => {
  vi.spyOn(prisma.widgetInstance, "findMany").mockImplementation((async () => [
    {
      id: "widget-1",
      profileId: "user-1",
      type: "clockDate",
      config: {},
      layoutX: 0,
      layoutY: 0,
      layoutW: 1,
      layoutH: 1,
      slideItem: { layoutX: 2, layoutY: 3, layoutW: 4, layoutH: 5 },
      createdAt: new Date("2026-03-21T10:00:00.000Z"),
      updatedAt: new Date("2026-03-21T10:00:00.000Z"),
    },
  ]) as never);

  const widgets = await widgetsRepository.findAll("user-1");
  expect(widgets[0].layout).toEqual({ x: 2, y: 3, w: 4, h: 5 });
});

test("widgetsRepository maps layout input to db layout fields on create", async () => {
  let capturedWidgetCreateArgs: unknown;

  const mockTx = {
    widgetInstance: {
      create: (async (args: unknown) => {
        capturedWidgetCreateArgs = args;
        return {
          id: "widget-1",
          profileId: "user-1",
          type: "clockDate",
          config: {},
          layoutX: 1,
          layoutY: 2,
          layoutW: 3,
          layoutH: 4,
          createdAt: new Date("2026-03-21T10:00:00.000Z"),
          updatedAt: new Date("2026-03-21T10:00:00.000Z"),
        };
      }) as typeof prisma.widgetInstance.create,
    },
    slide: {
      findFirst: (async () => ({
        id: "slide-1",
        profileId: "user-1",
        name: "Default",
        order: 0,
      })) as typeof prisma.slide.findFirst,
    },
    slideItem: {
      create: (async () => ({
        id: "slide-item-1",
        slideId: "slide-1",
        widgetInstanceId: "widget-1",
        layoutX: 1,
        layoutY: 2,
        layoutW: 3,
        layoutH: 4,
        zIndex: 0,
        createdAt: new Date(),
        updatedAt: new Date(),
      })) as typeof prisma.slideItem.create,
    },
  };

  vi.spyOn(prisma, "$transaction").mockImplementation(
    (async (callback: (tx: unknown) => unknown) => callback(mockTx as never)) as never,
  );

  vi.spyOn(prisma.widgetInstance, "findUniqueOrThrow").mockImplementation((async () => ({
    id: "widget-1",
    profileId: "user-1",
    type: "clockDate",
    config: {},
    layoutX: 1,
    layoutY: 2,
    layoutW: 3,
    layoutH: 4,
    slideItem: { layoutX: 1, layoutY: 2, layoutW: 3, layoutH: 4 },
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  })) as never);

  const created = await widgetsRepository.create({
    profileId: "user-1",
    type: "clockDate",
    config: {},
    layout: { x: 1, y: 2, w: 3, h: 4 },
  });

  expect(created.layout).toEqual({ x: 1, y: 2, w: 3, h: 4 });
  expect(capturedWidgetCreateArgs).toEqual({
    data: {
      profileId: "user-1",
      type: "clockDate",
      config: {},
      layoutX: 1,
      layoutY: 2,
      layoutW: 3,
      layoutH: 4,
    },
  });
});

test("widgetsRepository updateLayouts maps payload to layout db fields", async () => {
  const widgetInstanceUpdateManyCalls: unknown[] = [];
  const slideItemUpdateManyCalls: unknown[] = [];
  let findManyArgs: unknown;

  const mockTransaction = {
    widgetInstance: {
      updateMany: (async (args: unknown) => {
        widgetInstanceUpdateManyCalls.push(args);
        return { count: 1 };
      }) as typeof prisma.widgetInstance.updateMany,
    },
    slideItem: {
      updateMany: (async (args: unknown) => {
        slideItemUpdateManyCalls.push(args);
        return { count: 1 };
      }) as typeof prisma.slideItem.updateMany,
    },
  };

  vi.spyOn(prisma, "$transaction").mockImplementation(
    (async (callback: (transaction: unknown) => unknown) => {
      return callback(mockTransaction as never);
    }) as never,
  );

  vi.spyOn(prisma.widgetInstance, "findMany").mockImplementation((async (args: unknown) => {
    findManyArgs = args;
    return [
      {
        id: "widget-1",
        profileId: "user-1",
        type: "clockDate",
        config: {},
        layoutX: 3,
        layoutY: 2,
        layoutW: 4,
        layoutH: 2,
        slideItem: { layoutX: 3, layoutY: 2, layoutW: 4, layoutH: 2 },
        createdAt: new Date("2026-03-21T10:00:00.000Z"),
        updatedAt: new Date("2026-03-21T10:00:00.000Z"),
      },
    ];
  }) as never);

  const updated = await widgetsRepository.updateLayouts("user-1", [
    {
      id: "widget-1",
      layout: { x: 3, y: 2, w: 4, h: 2 },
    },
  ]);

  expect(updated.length).toBe(1);
  expect(updated[0].layout).toEqual({ x: 3, y: 2, w: 4, h: 2 });
  expect(widgetInstanceUpdateManyCalls).toEqual([
    {
      where: { id: "widget-1", profileId: "user-1" },
      data: { layoutX: 3, layoutY: 2, layoutW: 4, layoutH: 2 },
    },
  ]);
  expect(slideItemUpdateManyCalls).toEqual([
    {
      where: { widgetInstanceId: "widget-1" },
      data: { layoutX: 3, layoutY: 2, layoutW: 4, layoutH: 2 },
    },
  ]);
  expect(findManyArgs).toEqual({
    where: {
      id: { in: ["widget-1"] },
      profileId: "user-1",
    },
    include: { slideItem: true },
  });
});
