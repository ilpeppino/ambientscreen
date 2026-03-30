import React from "react"
import TestRenderer from "react-test-renderer"
import { describe, expect, test, vi } from "vitest"
import App from "../App"

vi.mock("../src/features/auth/auth.context", () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => React.createElement("auth-provider", {}, children),
  useAuth: () => ({
    isLoading: false,
    token: null,
    logout: vi.fn(async () => undefined),
  }),
}))

vi.mock("../src/features/entitlements/entitlements.context", () => ({
  EntitlementsProvider: ({ children }: { children: React.ReactNode }) => React.createElement("entitlements-provider", {}, children),
}))

vi.mock("../src/features/auth/screens/LoginScreen", () => ({
  LoginScreen: () => React.createElement("login-screen"),
}))

vi.mock("../src/features/admin/screens/AdminEditorScreen", () => ({
  AdminEditorScreen: () => React.createElement("admin-editor-screen"),
}))

vi.mock("../src/features/display/screens/DisplayScreen", () => ({
  DisplayScreen: () => React.createElement("display-screen"),
}))

vi.mock("../src/features/marketplace/screens/MarketplaceScreen", () => ({
  MarketplaceScreen: () => React.createElement("marketplace-screen"),
}))

vi.mock("../src/features/integrations/IntegrationsScreen", () => ({
  IntegrationsScreen: () => React.createElement("integrations-screen"),
}))

vi.mock("../src/features/remoteControl/screens/RemoteControlScreen", () => ({
  RemoteControlScreen: () => React.createElement("remote-control-screen"),
}))

vi.mock("../src/features/mobile/screens/ProfilePickerScreen", () => ({
  ProfilePickerScreen: () => React.createElement("profile-picker-screen"),
}))

vi.mock("../src/features/mobile/screens/MobileDisplayScreen", () => ({
  MobileDisplayScreen: () => React.createElement("mobile-display-screen"),
}))

vi.mock("../src/features/navigation/useDeepLinks", () => ({
  useDeepLinks: () => undefined,
}))

vi.mock("../src/features/navigation/useWebHistory", () => ({
  useWebHistory: () => undefined,
}))

vi.mock("../src/features/remoteControl/services/remoteCommandClient", () => ({
  createRemoteCommandClient: () => ({
    disconnect: vi.fn(),
    setDeviceId: vi.fn(),
    connect: vi.fn(),
  }),
}))

vi.mock("../src/features/remoteControl/services/remoteCommandBus", () => ({
  emitRemoteCommand: vi.fn(),
}))

vi.mock("../src/features/devices/deviceRegistration.logic", () => ({
  DEVICE_STORAGE_KEY: "ambient.device.v1",
  registerOrHeartbeatDevice: vi.fn(async () => "device-1"),
}))

vi.mock("../src/services/api/devicesApi", () => ({
  heartbeatDevice: vi.fn(async () => undefined),
  registerDevice: vi.fn(async () => ({ id: "device-1" })),
}))

vi.mock("../src/features/devices/deviceMetadata", () => ({
  getCurrentDeviceMetadata: vi.fn(() => ({
    name: "mock",
    platform: "web",
    deviceType: "web",
  })),
}))

describe("App root composition", () => {
  test("wraps the app tree in GestureHandlerRootView", () => {
    const tree = TestRenderer.create(<App />)

    const root = tree.root.findByType("gesture-handler-root-view" as any)
    expect(root).toBeDefined()
  })
})
