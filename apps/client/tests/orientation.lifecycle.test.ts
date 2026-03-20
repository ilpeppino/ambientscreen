import assert from "node:assert/strict";
import test from "node:test";
import {
  createDisplayOrientationLifecycle,
  type OrientationApi,
  type OrientationLogger,
} from "../src/features/display/services/orientation.lifecycle";

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
  const lockCalls: number[] = [];
  const unlockCalls: number[] = [];
  const warnings: string[] = [];
  const pendingLocks: DeferredPromise[] = [];
  const pendingUnlocks: DeferredPromise[] = [];

  const api: OrientationApi = {
    lock: async () => {
      lockCalls.push(lockCalls.length + 1);
      const deferred = createDeferredPromise();
      pendingLocks.push(deferred);
      return deferred.promise;
    },
    unlock: async () => {
      unlockCalls.push(unlockCalls.length + 1);
      const deferred = createDeferredPromise();
      pendingUnlocks.push(deferred);
      return deferred.promise;
    },
  };

  const logger: OrientationLogger = {
    warn: (message) => {
      warnings.push(message);
    },
  };

  const lifecycle = createDisplayOrientationLifecycle(api, logger);

  return {
    lifecycle,
    lockCalls,
    unlockCalls,
    warnings,
    pendingLocks,
    pendingUnlocks,
  };
}

async function flushMicrotaskQueue() {
  await Promise.resolve();
  await Promise.resolve();
  await new Promise<void>((resolve) => {
    setImmediate(resolve);
  });
}

test("enable/disable locks landscape then restores orientation", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.pendingLocks[0].resolve();
  await flushMicrotaskQueue();
  fixture.lifecycle.disable();
  fixture.pendingUnlocks[0].resolve();
  await flushMicrotaskQueue();

  assert.equal(fixture.lockCalls.length, 1);
  assert.equal(fixture.unlockCalls.length, 1);
  assert.deepEqual(fixture.warnings, []);
});

test("extra disable is idempotent and does not over-unlock", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.pendingLocks[0].resolve();
  await flushMicrotaskQueue();
  fixture.lifecycle.disable();
  fixture.lifecycle.disable();
  fixture.pendingUnlocks[0].resolve();
  await flushMicrotaskQueue();

  assert.equal(fixture.lockCalls.length, 1);
  assert.equal(fixture.unlockCalls.length, 1);
});

test("late lock completion after exit is compensated with unlock", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.lifecycle.disable();

  fixture.pendingLocks[0].resolve();
  await flushMicrotaskQueue();
  fixture.pendingUnlocks[0].resolve();
  await flushMicrotaskQueue();

  assert.equal(fixture.lockCalls.length, 1);
  assert.equal(fixture.unlockCalls.length, 1);
});

test("stale unlock completion after re-enter triggers relock", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.pendingLocks[0].resolve();
  await flushMicrotaskQueue();

  fixture.lifecycle.disable();
  fixture.lifecycle.enable();

  fixture.pendingUnlocks[0].resolve();
  await flushMicrotaskQueue();
  fixture.pendingLocks[1].resolve();
  await flushMicrotaskQueue();

  assert.equal(fixture.lockCalls.length, 2);
  assert.equal(fixture.unlockCalls.length, 1);
});

test("lock failure is logged", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.pendingLocks[0].reject(new Error("lock failed"));
  await flushMicrotaskQueue();

  assert.deepEqual(fixture.warnings, ["Failed to lock landscape orientation"]);
});

test("unlock failure is logged", async () => {
  const fixture = createLifecycleFixture();

  fixture.lifecycle.enable();
  fixture.pendingLocks[0].resolve();
  await flushMicrotaskQueue();

  fixture.lifecycle.disable();
  fixture.pendingUnlocks[0].reject(new Error("unlock failed"));
  await flushMicrotaskQueue();

  assert.deepEqual(fixture.warnings, ["Failed to restore orientation"]);
});
