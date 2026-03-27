import { expect, test } from "vitest"
import {
  isMobileAdminReachableInNormalFlow,
  resolveMobileAppStage,
} from "../src/features/mobile/mobileAppShell.logic"

test("unauthenticated launch resolves to login", () => {
  expect(resolveMobileAppStage({
    isLoading: false,
    isAuthenticated: false,
    selectedProfileId: null,
  })).toBe("login")
})

test("authenticated launch with no selected profile resolves to profile picker", () => {
  expect(resolveMobileAppStage({
    isLoading: false,
    isAuthenticated: true,
    selectedProfileId: null,
  })).toBe("profilePicker")
})

test("selected profile resolves to display mode", () => {
  expect(resolveMobileAppStage({
    isLoading: false,
    isAuthenticated: true,
    selectedProfileId: "profile-1",
  })).toBe("display")
})

test("loading state resolves to boot", () => {
  expect(resolveMobileAppStage({
    isLoading: true,
    isAuthenticated: false,
    selectedProfileId: null,
  })).toBe("boot")
})

test("mobile admin is not reachable in normal flow", () => {
  expect(isMobileAdminReachableInNormalFlow()).toBe(false)
})
