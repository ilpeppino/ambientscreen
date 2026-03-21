import { test, expect } from "vitest";
import type { OrchestrationRule } from "@ambient/shared-contracts";
import { createOrchestrationEngine } from "../src/features/display/services/orchestrationEngine";

interface ScheduledInterval {
  callback: () => void;
  intervalMs: number;
}

function createTimerApiStub() {
  let nextIntervalId = 1;
  const activeIntervals = new Map<number, ScheduledInterval>();
  const clearedIntervalIds: number[] = [];

  return {
    timerApi: {
      setInterval: (callback: () => void, intervalMs: number) => {
        const intervalId = nextIntervalId;
        nextIntervalId += 1;
        activeIntervals.set(intervalId, { callback, intervalMs });
        return intervalId as unknown as ReturnType<typeof setInterval>;
      },
      clearInterval: (intervalId: ReturnType<typeof setInterval>) => {
        const id = intervalId as unknown as number;
        clearedIntervalIds.push(id);
        activeIntervals.delete(id);
      },
    },
    getActiveIntervals() {
      return [...activeIntervals.entries()];
    },
    getClearedIntervalIds() {
      return [...clearedIntervalIds];
    },
    triggerInterval(id: number) {
      const scheduled = activeIntervals.get(id);
      if (!scheduled) {
        throw new Error(`Interval ${id} not found`);
      }
      scheduled.callback();
    },
  };
}

function getRule(overrides?: Partial<OrchestrationRule>): OrchestrationRule {
  return {
    id: "rule-1",
    userId: "user-1",
    type: "interval",
    intervalSec: 5,
    isActive: true,
    rotationProfileIds: [],
    currentIndex: 0,
    createdAt: "2026-03-21T10:00:00.000Z",
    ...overrides,
  };
}

test("orchestration engine loads rules and schedules intervals for active interval rules", async () => {
  const timer = createTimerApiStub();
  const engine = createOrchestrationEngine({
    loadRules: async () => [
      getRule({ id: "rule-1", intervalSec: 3, isActive: true }),
      getRule({ id: "rule-2", intervalSec: 10, isActive: false }),
    ],
    onRefresh: () => undefined,
    timerApi: timer.timerApi,
  });

  await engine.start();

  expect(timer.getActiveIntervals().length).toBe(1);
  expect(timer.getActiveIntervals()[0][1].intervalMs).toBe(3000);
});

test("orchestration engine avoids duplicate intervals for the same rule", async () => {
  const timer = createTimerApiStub();
  const engine = createOrchestrationEngine({
    loadRules: async () => [getRule({ id: "rule-1", intervalSec: 7 })],
    onRefresh: () => undefined,
    timerApi: timer.timerApi,
  });

  await engine.start();
  await engine.reload();

  expect(timer.getActiveIntervals().length).toBe(1);
  expect(timer.getClearedIntervalIds()).toEqual([]);
});

test("orchestration engine debounces overlapping executions for the same rule", async () => {
  const timer = createTimerApiStub();
  let resolveRun!: () => void;
  const runGate = new Promise<void>((resolve) => {
    resolveRun = resolve;
  });
  let refreshCount = 0;
  const engine = createOrchestrationEngine({
    loadRules: async () => [getRule({ id: "rule-1", intervalSec: 1 })],
    onRefresh: async () => {
      refreshCount += 1;
      await runGate;
    },
    timerApi: timer.timerApi,
  });

  await engine.start();
  const intervalId = timer.getActiveIntervals()[0][0];
  timer.triggerInterval(intervalId);
  timer.triggerInterval(intervalId);

  expect(refreshCount).toBe(1);

  resolveRun();
  await new Promise((resolve) => setImmediate(resolve));
  timer.triggerInterval(intervalId);
  expect(refreshCount).toBe(2);
});

test("orchestration engine stop clears all active timers", async () => {
  const timer = createTimerApiStub();
  const engine = createOrchestrationEngine({
    loadRules: async () => [
      getRule({ id: "rule-1", intervalSec: 2 }),
      getRule({ id: "rule-2", intervalSec: 4 }),
    ],
    onRefresh: () => undefined,
    timerApi: timer.timerApi,
  });

  await engine.start();
  expect(timer.getActiveIntervals().length).toBe(2);

  engine.stop();

  expect(timer.getActiveIntervals().length).toBe(0);
  expect(timer.getClearedIntervalIds().length).toBe(2);
});

test("integration: create rule then start engine executes refresh on interval", async () => {
  const timer = createTimerApiStub();
  const rulesStore: OrchestrationRule[] = [];
  let refreshCount = 0;

  const engine = createOrchestrationEngine({
    loadRules: async () => rulesStore,
    onRefresh: () => {
      refreshCount += 1;
    },
    timerApi: timer.timerApi,
  });

  rulesStore.push(getRule({ id: "rule-created", intervalSec: 6 }));
  await engine.start();

  expect(timer.getActiveIntervals().length).toBe(1);
  const intervalId = timer.getActiveIntervals()[0][0];
  timer.triggerInterval(intervalId);

  expect(refreshCount).toBe(1);
});

test("rotation rule switches profiles in sequence", async () => {
  const timer = createTimerApiStub();
  const switchedProfiles: string[] = [];
  const engine = createOrchestrationEngine({
    loadRules: async () => [
      getRule({
        id: "rotation-rule",
        type: "rotation",
        intervalSec: 2,
        rotationProfileIds: ["profile-1", "profile-2", "profile-3"],
        currentIndex: 0,
      }),
    ],
    onRefresh: () => undefined,
    onSwitchProfile: (profileId: string) => {
      switchedProfiles.push(profileId);
    },
    timerApi: timer.timerApi,
  });

  await engine.start();

  const intervalId = timer.getActiveIntervals()[0][0];
  timer.triggerInterval(intervalId);
  await new Promise((resolve) => setImmediate(resolve));
  timer.triggerInterval(intervalId);
  await new Promise((resolve) => setImmediate(resolve));
  timer.triggerInterval(intervalId);
  await new Promise((resolve) => setImmediate(resolve));

  expect(switchedProfiles).toEqual(["profile-2", "profile-3", "profile-1"]);
});

test("rotation rule does not switch when fewer than two profiles are configured", async () => {
  const timer = createTimerApiStub();
  const switchedProfiles: string[] = [];
  const engine = createOrchestrationEngine({
    loadRules: async () => [
      getRule({
        id: "rotation-rule",
        type: "rotation",
        intervalSec: 2,
        rotationProfileIds: ["profile-1"],
        currentIndex: 0,
      }),
    ],
    onRefresh: () => undefined,
    onSwitchProfile: (profileId: string) => {
      switchedProfiles.push(profileId);
    },
    timerApi: timer.timerApi,
  });

  await engine.start();
  const intervalId = timer.getActiveIntervals()[0][0];
  timer.triggerInterval(intervalId);

  expect(switchedProfiles).toEqual([]);
});
