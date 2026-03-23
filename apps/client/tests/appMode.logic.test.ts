import { test, expect } from "vitest";
import {
  enterDisplayMode,
  enterMarketplaceMode,
  enterRemoteControlMode,
  exitDisplayMode,
  exitMarketplaceMode,
  exitRemoteControlMode,
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

test("navigation enters remote control mode from admin", () => {
  expect(enterRemoteControlMode()).toBe("remoteControl");
});

test("navigation exits remote control mode back to admin", () => {
  expect(exitRemoteControlMode()).toBe("admin");
});

test("navigation enters marketplace mode from admin", () => {
  expect(enterMarketplaceMode()).toBe("marketplace");
});

test("navigation exits marketplace mode back to admin", () => {
  expect(exitMarketplaceMode()).toBe("admin");
});

test("all enter transitions produce non-admin modes", () => {
  expect(enterDisplayMode()).not.toBe("admin");
  expect(enterRemoteControlMode()).not.toBe("admin");
  expect(enterMarketplaceMode()).not.toBe("admin");
});

test("all exit transitions return to admin", () => {
  expect(exitDisplayMode()).toBe("admin");
  expect(exitRemoteControlMode()).toBe("admin");
  expect(exitMarketplaceMode()).toBe("admin");
});
