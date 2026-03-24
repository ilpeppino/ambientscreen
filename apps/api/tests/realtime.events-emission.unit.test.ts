import { test, expect, afterEach, beforeEach, vi } from "vitest";
import { profilesRepository } from "../src/modules/profiles/profiles.repository";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { configureRealtimeServer, resetRealtimeServerForTests } from "../src/modules/realtime/realtime.runtime";
import type { RealtimeEvent } from "../src/modules/realtime/realtime.types";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetsService } from "../src/modules/widgets/widgets.service";

let emittedEvents: RealtimeEvent[] = [];

beforeEach(() => {
  emittedEvents = [];
  configureRealtimeServer({
    publish: (event) => {
      emittedEvents.push(event);
    },
    publishDeviceCommand: () => false,
    getDeviceConnectionSnapshot: () => ({
      online: false,
      lastConnectedAt: null,
    }),
    close: async () => undefined,
  });
});

afterEach(() => {
  vi.restoreAllMocks();
  resetRealtimeServerForTests();
});

test("widgetsService emits widget.created and display.refreshRequested on create", async () => {
  vi.spyOn(widgetsRepository, "findAll").mockImplementation(async () => [] as never);

  vi.spyOn(widgetsRepository, "create").mockImplementation(async (input) => ({
    id: "widget-1",
    profileId: input.profileId,
    type: input.type,
    config: {},
    layout: input.layout,
    isActive: input.isActive,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  }) as never);

  await widgetsService.createWidgetAtNextPosition({
    profileId: "profile-1",
    type: "clockDate",
  });

  expect(
    emittedEvents.map((event) => event.type),
  ).toEqual(["widget.created", "display.refreshRequested"]);
  expect(emittedEvents[0].profileId).toBe("profile-1");
  expect(emittedEvents[0].widgetId).toBe("widget-1");
});

test("widgetsService emits widget.updated and display.refreshRequested on config update", async () => {
  vi.spyOn(widgetsRepository, "findById").mockImplementation(async () => ({
    id: "widget-1",
    profileId: "profile-1",
    type: "weather",
    config: { location: "Amsterdam", units: "metric" },
    layout: { x: 0, y: 0, w: 1, h: 1 },
    isActive: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  }) as never);

  vi.spyOn(widgetsRepository, "updateConfig").mockImplementation(async () => ({
    id: "widget-1",
    profileId: "profile-1",
    type: "weather",
    config: { location: "Rotterdam", units: "metric" },
    layout: { x: 0, y: 0, w: 1, h: 1 },
    isActive: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:05:00.000Z"),
  }) as never);

  await widgetsService.updateWidgetConfigForProfile({
    profileId: "profile-1",
    widgetId: "widget-1",
    configPatch: { location: "Rotterdam" },
  });

  expect(
    emittedEvents.map((event) => event.type),
  ).toEqual(["widget.updated", "display.refreshRequested"]);
  expect(emittedEvents[0].widgetId).toBe("widget-1");
});

test("widgetsService emits layout.updated and display.refreshRequested on layout update", async () => {
  vi.spyOn(widgetsRepository, "updateLayouts").mockImplementation(async (
    profileId,
    inputs,
  ) => inputs.map((input) => ({
    id: input.id,
    profileId,
    type: "clockDate",
    config: {},
    layout: input.layout,
    isActive: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:05:00.000Z"),
  })) as never);

  await widgetsService.updateWidgetsLayoutForProfile({
    profileId: "profile-1",
    widgets: [
      {
        id: "widget-1",
        layout: { x: 1, y: 1, w: 2, h: 1 },
      },
    ],
  });

  expect(
    emittedEvents.map((event) => event.type),
  ).toEqual(["layout.updated", "display.refreshRequested"]);
  expect(emittedEvents[0].profileId).toBe("profile-1");
});

test("widgetsService emits widget.deleted and display.refreshRequested on widget delete", async () => {
  vi.spyOn(widgetsRepository, "deleteById").mockImplementation(async () => ({
    id: "widget-1",
    profileId: "profile-1",
    type: "calendar",
    config: {},
    layout: { x: 0, y: 0, w: 3, h: 2 },
    isActive: false,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  }) as never);

  await widgetsService.deleteWidgetForProfile({
    profileId: "profile-1",
    widgetId: "widget-1",
  });

  expect(
    emittedEvents.map((event) => event.type),
  ).toEqual(["widget.deleted", "display.refreshRequested"]);
  expect(emittedEvents[0].widgetId).toBe("widget-1");
});

test("profilesService emits profile.updated and display.refreshRequested on rename", async () => {
  vi.spyOn(profilesRepository, "findByIdForUser").mockImplementation(async () => ({
    id: "profile-1",
    userId: "user-1",
    name: "Before",
    isDefault: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    defaultSlideDurationSeconds: 30,
  }) as never);

  vi.spyOn(profilesRepository, "update").mockImplementation(async () => ({
    id: "profile-1",
    userId: "user-1",
    name: "After",
    isDefault: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    defaultSlideDurationSeconds: 30,
  }) as never);

  await profilesService.renameProfileForUser({
    userId: "user-1",
    profileId: "profile-1",
    name: "After",
  });

  expect(
    emittedEvents.map((event) => event.type),
  ).toEqual(["profile.updated", "display.refreshRequested"]);
  expect(emittedEvents[0].profileId).toBe("profile-1");
});
