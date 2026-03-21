import { afterEach, beforeEach, expect, test, vi } from "vitest";
import { configureRealtimeServer, resetRealtimeServerForTests } from "../src/modules/realtime/realtime.runtime";
import type { RealtimeEvent } from "../src/modules/realtime/realtime.types";
import { sharedSessionsRepository } from "../src/modules/sharedSessions/sharedSessions.repository";
import { sharedSessionsService } from "../src/modules/sharedSessions/sharedSessions.service";

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
  vi.restoreAllMocks();
  resetRealtimeServerForTests();
});

test("advanceDueSessionRotations advances one index deterministically and emits session events", async () => {
  const now = new Date("2026-03-21T12:00:00.000Z");
  vi.spyOn(sharedSessionsRepository, "findActiveSessionsForRotation").mockImplementation(async () => ([
    {
      id: "session-1",
      userId: "user-1",
      name: "Main",
      isActive: true,
      activeProfileId: "profile-1",
      slideshowEnabled: true,
      slideshowIntervalSec: 30,
      rotationProfileIds: ["profile-1", "profile-2", "profile-3"],
      currentIndex: 0,
      lastAdvancedAt: new Date("2026-03-21T11:59:20.000Z"),
      createdAt: new Date("2026-03-21T11:00:00.000Z"),
      updatedAt: new Date("2026-03-21T11:59:20.000Z"),
      participants: [],
    },
  ]) as never);

  vi.spyOn(sharedSessionsRepository, "advanceRotation").mockImplementation(async (input) => ({
    id: input.id,
    userId: "user-1",
    name: "Main",
    isActive: true,
    activeProfileId: input.nextActiveProfileId,
    slideshowEnabled: true,
    slideshowIntervalSec: 30,
    rotationProfileIds: ["profile-1", "profile-2", "profile-3"],
    currentIndex: input.nextCurrentIndex,
    lastAdvancedAt: input.advancedAt,
    createdAt: new Date("2026-03-21T11:00:00.000Z"),
    updatedAt: input.advancedAt,
    participants: [],
  }) as never);

  const advancedCount = await sharedSessionsService.advanceDueSessionRotations(now);

  expect(advancedCount).toBe(1);
  expect(
    emittedEvents
      .filter((event) => event.scope === "sharedSession")
      .map((event) => event.type),
  ).toEqual(["sharedSession.rotationAdvanced", "sharedSession.updated"]);

  const rotationEvent = emittedEvents.find((event) => event.type === "sharedSession.rotationAdvanced");
  expect(rotationEvent && rotationEvent.scope === "sharedSession" && rotationEvent.sessionId).toBe("session-1");
});


test("advanceDueSessionRotations skips sessions that are not due", async () => {
  const now = new Date("2026-03-21T12:00:00.000Z");
  vi.spyOn(sharedSessionsRepository, "findActiveSessionsForRotation").mockImplementation(async () => ([
    {
      id: "session-1",
      userId: "user-1",
      name: "Main",
      isActive: true,
      activeProfileId: "profile-1",
      slideshowEnabled: true,
      slideshowIntervalSec: 60,
      rotationProfileIds: ["profile-1", "profile-2"],
      currentIndex: 0,
      lastAdvancedAt: new Date("2026-03-21T11:59:30.000Z"),
      createdAt: new Date("2026-03-21T11:00:00.000Z"),
      updatedAt: new Date("2026-03-21T11:59:30.000Z"),
      participants: [],
    },
  ]) as never);

  const advanceSpy = vi.spyOn(sharedSessionsRepository, "advanceRotation");
  const advancedCount = await sharedSessionsService.advanceDueSessionRotations(now);

  expect(advancedCount).toBe(0);
  expect(advanceSpy).not.toHaveBeenCalled();
});
