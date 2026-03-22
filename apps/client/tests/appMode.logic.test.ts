import { test, expect } from "vitest";
import {
  enterDisplayMode,
  enterMarketplaceMode,
  enterRemoteControlMode,
  exitDisplayMode,
  exitMarketplaceMode,
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

test("navigation enters marketplace mode from admin", () => {
  expect(enterMarketplaceMode()).toBe("marketplace");
});

test("navigation exits marketplace mode back to admin", () => {
  expect(exitMarketplaceMode()).toBe("admin");
});
