import assert from "node:assert/strict";
import test from "node:test";
import { createDisplayRefreshEngine } from "../src/features/display/displayRefresh.engine";

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

test("createDisplayRefreshEngine schedules refresh using widget policy and refreshes immediately", () => {
  const timer = createTimerApiStub();
  const engine = createDisplayRefreshEngine(timer.timerApi);
  let refreshCount = 0;

  engine.start({
    widgetInstanceId: "widget-1",
    widgetType: "clockDate",
    onRefresh: () => {
      refreshCount += 1;
    },
  });

  assert.equal(refreshCount, 1);
  assert.equal(timer.getActiveIntervals().length, 1);
  assert.equal(timer.getActiveIntervals()[0][1].intervalMs, 1000);

  timer.triggerInterval(timer.getActiveIntervals()[0][0]);
  assert.equal(refreshCount, 2);
});

test("createDisplayRefreshEngine avoids duplicate polling for identical widget start", () => {
  const timer = createTimerApiStub();
  const engine = createDisplayRefreshEngine(timer.timerApi);
  let refreshCount = 0;

  const startInput = {
    widgetInstanceId: "widget-1",
    widgetType: "weather" as const,
    onRefresh: () => {
      refreshCount += 1;
    },
  };

  engine.start(startInput);
  engine.start(startInput);

  assert.equal(refreshCount, 1);
  assert.equal(timer.getActiveIntervals().length, 1);
  assert.deepEqual(timer.getClearedIntervalIds(), []);
});

test("createDisplayRefreshEngine clears prior interval before starting a different widget", () => {
  const timer = createTimerApiStub();
  const engine = createDisplayRefreshEngine(timer.timerApi);

  engine.start({
    widgetInstanceId: "widget-1",
    widgetType: "clockDate",
    onRefresh: () => undefined,
  });

  const firstIntervalId = timer.getActiveIntervals()[0][0];

  engine.start({
    widgetInstanceId: "widget-2",
    widgetType: "calendar",
    onRefresh: () => undefined,
  });

  assert.deepEqual(timer.getClearedIntervalIds(), [firstIntervalId]);
  assert.equal(timer.getActiveIntervals().length, 1);
  assert.equal(timer.getActiveIntervals()[0][1].intervalMs, 60000);
});

test("createDisplayRefreshEngine stop clears interval and prevents further polling", () => {
  const timer = createTimerApiStub();
  const engine = createDisplayRefreshEngine(timer.timerApi);
  let refreshCount = 0;

  engine.start({
    widgetInstanceId: "widget-1",
    widgetType: "weather",
    onRefresh: () => {
      refreshCount += 1;
    },
  });

  const intervalId = timer.getActiveIntervals()[0][0];
  engine.stop();

  assert.deepEqual(timer.getClearedIntervalIds(), [intervalId]);
  assert.equal(timer.getActiveIntervals().length, 0);
  assert.equal(refreshCount, 1);
});
