import { test, expect } from "vitest";
import {
  enterDisplayMode,
  exitDisplayMode,
  getInitialAppMode,
} from "../src/features/navigation/appMode.logic";

test("navigation starts in admin mode", () => {
  expect(getInitialAppMode()).toBe("admin");
});

test("navigation enters display mode from admin", () => {
  expect(enterDisplayMode()).toBe("display");
});

test("navigation exits display mode back to admin", () => {
  expect(exitDisplayMode()).toBe("admin");
});
