import assert from "node:assert/strict";
import test, { afterEach, beforeEach } from "node:test";
import { profilesRepository } from "../src/modules/profiles/profiles.repository";
import { profilesService } from "../src/modules/profiles/profiles.service";
import { configureRealtimeServer, resetRealtimeServerForTests } from "../src/modules/realtime/realtime.runtime";
import type { RealtimeEvent } from "../src/modules/realtime/realtime.types";
import { widgetsRepository } from "../src/modules/widgets/widgets.repository";
import { widgetsService } from "../src/modules/widgets/widgets.service";

const originalWidgetFindAll = widgetsRepository.findAll;
const originalWidgetCreate = widgetsRepository.create;
const originalWidgetFindById = widgetsRepository.findById;
const originalWidgetUpdateConfig = widgetsRepository.updateConfig;
const originalWidgetUpdateLayouts = widgetsRepository.updateLayouts;
const originalWidgetDeleteById = widgetsRepository.deleteById;
const originalProfileFindById = profilesRepository.findById;
const originalProfileUpdateName = profilesRepository.updateName;

let emittedEvents: RealtimeEvent[] = [];

beforeEach(() => {
  emittedEvents = [];
  configureRealtimeServer({
    publish: (event) => {
      emittedEvents.push(event);
    },
    close: async () => undefined,
  });
});

afterEach(() => {
  (widgetsRepository as unknown as { findAll: typeof widgetsRepository.findAll }).findAll = originalWidgetFindAll;
  (widgetsRepository as unknown as { create: typeof widgetsRepository.create }).create = originalWidgetCreate;
  (widgetsRepository as unknown as { findById: typeof widgetsRepository.findById }).findById = originalWidgetFindById;
  (widgetsRepository as unknown as { updateConfig: typeof widgetsRepository.updateConfig }).updateConfig = originalWidgetUpdateConfig;
  (widgetsRepository as unknown as { updateLayouts: typeof widgetsRepository.updateLayouts }).updateLayouts = originalWidgetUpdateLayouts;
  (widgetsRepository as unknown as { deleteById: typeof widgetsRepository.deleteById }).deleteById = originalWidgetDeleteById;
  (profilesRepository as unknown as { findById: typeof profilesRepository.findById }).findById = originalProfileFindById;
  (profilesRepository as unknown as { updateName: typeof profilesRepository.updateName }).updateName = originalProfileUpdateName;
  resetRealtimeServerForTests();
});

test("widgetsService emits widget.created and display.refreshRequested on create", async () => {
  (widgetsRepository as unknown as { findAll: typeof widgetsRepository.findAll }).findAll =
    async () => [];

  (widgetsRepository as unknown as { create: (input: { profileId: string; type: string; layout: { x: number; y: number; w: number; h: number }; isActive: boolean }) => Promise<unknown> }).create = async (input) => ({
    id: "widget-1",
    profileId: input.profileId,
    type: input.type,
    config: {},
    layout: input.layout,
    isActive: input.isActive,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  });

  await widgetsService.createWidgetAtNextPosition({
    profileId: "profile-1",
    type: "clockDate",
  });

  assert.deepEqual(
    emittedEvents.map((event) => event.type),
    ["widget.created", "display.refreshRequested"],
  );
  assert.equal(emittedEvents[0].profileId, "profile-1");
  assert.equal(emittedEvents[0].widgetId, "widget-1");
});

test("widgetsService emits widget.updated and display.refreshRequested on config update", async () => {
  (widgetsRepository as unknown as { findById: typeof widgetsRepository.findById }).findById = async () => ({
    id: "widget-1",
    profileId: "profile-1",
    type: "weather",
    config: { location: "Amsterdam", units: "metric" },
    layout: { x: 0, y: 0, w: 1, h: 1 },
    isActive: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  });

  (widgetsRepository as unknown as { updateConfig: typeof widgetsRepository.updateConfig }).updateConfig = async () => ({
    id: "widget-1",
    profileId: "profile-1",
    type: "weather",
    config: { location: "Rotterdam", units: "metric" },
    layout: { x: 0, y: 0, w: 1, h: 1 },
    isActive: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:05:00.000Z"),
  });

  await widgetsService.updateWidgetConfigForProfile({
    profileId: "profile-1",
    widgetId: "widget-1",
    configPatch: { location: "Rotterdam" },
  });

  assert.deepEqual(
    emittedEvents.map((event) => event.type),
    ["widget.updated", "display.refreshRequested"],
  );
  assert.equal(emittedEvents[0].widgetId, "widget-1");
});

test("widgetsService emits layout.updated and display.refreshRequested on layout update", async () => {
  (widgetsRepository as unknown as { updateLayouts: typeof widgetsRepository.updateLayouts }).updateLayouts = async (
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
  }));

  await widgetsService.updateWidgetsLayoutForProfile({
    profileId: "profile-1",
    widgets: [
      {
        id: "widget-1",
        layout: { x: 1, y: 1, w: 2, h: 1 },
      },
    ],
  });

  assert.deepEqual(
    emittedEvents.map((event) => event.type),
    ["layout.updated", "display.refreshRequested"],
  );
  assert.equal(emittedEvents[0].profileId, "profile-1");
});

test("widgetsService emits widget.deleted and display.refreshRequested on widget delete", async () => {
  (widgetsRepository as unknown as { deleteById: typeof widgetsRepository.deleteById }).deleteById = async () => ({
    id: "widget-1",
    profileId: "profile-1",
    type: "calendar",
    config: {},
    layout: { x: 0, y: 0, w: 3, h: 2 },
    isActive: false,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
    updatedAt: new Date("2026-03-21T10:00:00.000Z"),
  });

  await widgetsService.deleteWidgetForProfile({
    profileId: "profile-1",
    widgetId: "widget-1",
  });

  assert.deepEqual(
    emittedEvents.map((event) => event.type),
    ["widget.deleted", "display.refreshRequested"],
  );
  assert.equal(emittedEvents[0].widgetId, "widget-1");
});

test("profilesService emits profile.updated and display.refreshRequested on rename", async () => {
  (profilesRepository as unknown as { findById: (id: string) => Promise<unknown> }).findById = async () => ({
    id: "profile-1",
    userId: "user-1",
    name: "Before",
    isDefault: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
  });

  (profilesRepository as unknown as { updateName: (id: string, name: string) => Promise<unknown> }).updateName = async () => ({
    id: "profile-1",
    userId: "user-1",
    name: "After",
    isDefault: true,
    createdAt: new Date("2026-03-21T10:00:00.000Z"),
  });

  await profilesService.renameProfileForUser({
    userId: "user-1",
    profileId: "profile-1",
    name: "After",
  });

  assert.deepEqual(
    emittedEvents.map((event) => event.type),
    ["profile.updated", "display.refreshRequested"],
  );
  assert.equal(emittedEvents[0].profileId, "profile-1");
});
