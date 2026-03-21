import { test, expect } from "vitest";
import {
  createDisplayKeepAwakeLifecycle,
  type KeepAwakeApi,
  type KeepAwakeLogger,
} from "../src/features/display/services/keepAwake.lifecycle";

interface DeferredPromise {
  resolve: (value?: void | PromiseLike<void>) => void;
  reject: (reason?: unknown) => void;
  promise: Promise<void>;
}

function createDeferredPromise(): DeferredPromise {
  let resolve: (value?: void | PromiseLike<void>) => void = () => undefined;
  let reject: (reason?: unknown) => void = () => undefined;

  const promise = new Promise<void>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });

  return {
    resolve,
    reject,
    promise,
  };
}

function createLifecycleFixture() {
  const activateCalls: string[] = [];
  const deactivateCalls: string[] = [];
  const warnings: string[] = [];
  const pendingActivations: DeferredPromise[] = [];

  const api: KeepAwakeApi = {
    activate: async (tag: string) => {
      activateCalls.push(tag);
      const deferred = createDeferredPromise();
      pendingActivations.push(deferred);
      return deferred.promise;
    },
    deactivate: (tag: string) => {
      deactivateCalls.push(tag);
    },
  };

  const logger: KeepAwakeLogger = {
    warn: (message) => {
      warnings.push(message);
    },
  };

  const lifecycle = createDisplayKeepAwakeLifecycle(api, logger);

  return {
    lifecycle,
    activateCalls,
    deactivateCalls,
    warnings,
    pendingActivations,
  };
}

async function flushMicrotaskQueue() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

test("enable/disable toggles keep-awake tag", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.pendingActivations[0].resolve();
  await flushMicrotaskQueue();
  fixture.lifecycle.disable();

  expect(fixture.activateCalls).toEqual(["display-mode"]);
  expect(fixture.deactivateCalls).toEqual(["display-mode"]);
  expect(fixture.warnings).toEqual([]);
});

test("disable is idempotent and does not over-release", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.pendingActivations[0].resolve();
  await flushMicrotaskQueue();
  fixture.lifecycle.disable();
  fixture.lifecycle.disable();

  expect(fixture.activateCalls).toEqual(["display-mode"]);
  expect(fixture.deactivateCalls).toEqual(["display-mode"]);
});

test("late activation after disable is compensated to prevent leaks", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.lifecycle.disable();

  expect(fixture.deactivateCalls).toEqual(["display-mode"]);

  fixture.pendingActivations[0].resolve();
  await flushMicrotaskQueue();

  expect(fixture.deactivateCalls).toEqual(["display-mode", "display-mode"]);
});

test("stale activation does not disable active keep-awake after re-entering display mode", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.lifecycle.disable();
  fixture.lifecycle.enable();

  fixture.pendingActivations[0].resolve();
  await flushMicrotaskQueue();

  expect(fixture.deactivateCalls).toEqual(["display-mode"]);

  fixture.pendingActivations[1].resolve();
  await flushMicrotaskQueue();
  fixture.lifecycle.disable();

  expect(fixture.activateCalls).toEqual(["display-mode", "display-mode"]);
  expect(fixture.deactivateCalls).toEqual(["display-mode", "display-mode"]);
});

test("activation failures are logged and do not crash lifecycle", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.pendingActivations[0].reject(new Error("activation failed"));
  await flushMicrotaskQueue();

  expect(fixture.warnings).toEqual(["Failed to enable keep awake"]);
});
