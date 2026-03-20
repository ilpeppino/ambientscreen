import assert from "node:assert/strict";
import test from "node:test";
import {
  enterDisplayMode,
  exitDisplayMode,
  getInitialAppMode,
} from "../src/features/navigation/appMode.logic";

test("navigation starts in admin mode", () => {
  assert.equal(getInitialAppMode(), "admin");
});

test("navigation enters display mode from admin", () => {
  assert.equal(enterDisplayMode(), "display");
});

test("navigation exits display mode back to admin", () => {
  assert.equal(exitDisplayMode(), "admin");
});
