import type { Profile } from "@ambient/shared-contracts"
import React from "react"
import TestRenderer from "react-test-renderer"
import { describe, expect, test, vi, beforeEach } from "vitest"
import { ProfilePickerScreen } from "../src/features/mobile/screens/ProfilePickerScreen"

const mockUseCloudProfiles = vi.fn()

vi.mock("../src/features/profiles/useCloudProfiles", () => ({
  useCloudProfiles: () => mockUseCloudProfiles(),
}))

const baseProfiles: Profile[] = [
  {
    id: "profile-1",
    userId: "user-1",
    name: "Lobby",
    isDefault: true,
    createdAt: "2026-03-01T00:00:00.000Z",
    defaultSlideDurationSeconds: 25,
  },
  {
    id: "profile-2",
    userId: "user-1",
    name: "Cafe",
    isDefault: false,
    createdAt: "2026-03-02T00:00:00.000Z",
    defaultSlideDurationSeconds: 30,
  },
]

beforeEach(() => {
  mockUseCloudProfiles.mockReset()
  mockUseCloudProfiles.mockReturnValue({
    profiles: baseProfiles,
    isLoadingProfiles: false,
    profilesError: null,
    refreshProfiles: vi.fn(),
    activateProfile: vi.fn(async () => "profile-1"),
  })
})

describe("ProfilePickerScreen", () => {
  test("renders loading state", () => {
    mockUseCloudProfiles.mockReturnValueOnce({
      profiles: [],
      isLoadingProfiles: true,
      profilesError: null,
      refreshProfiles: vi.fn(),
      activateProfile: vi.fn(async () => ""),
    })

    const tree = TestRenderer.create(
      <ProfilePickerScreen onSelectProfile={vi.fn()} onLogout={vi.fn(async () => undefined)} />,
    )

    const json = JSON.stringify(tree.toJSON())
    expect(json).toContain("Loading profiles")
  })

  test("renders profiles as cards", () => {
    const tree = TestRenderer.create(
      <ProfilePickerScreen onSelectProfile={vi.fn()} onLogout={vi.fn(async () => undefined)} />,
    )

    const json = JSON.stringify(tree.toJSON())
    expect(json).toContain("Lobby")
    expect(json).toContain("Cafe")
    expect(json).toContain("Slide duration: 25s")
  })

  test("selecting a profile activates then emits selection", async () => {
    const activateProfile = vi.fn(async () => "profile-2")
    mockUseCloudProfiles.mockReturnValueOnce({
      profiles: baseProfiles,
      isLoadingProfiles: false,
      profilesError: null,
      refreshProfiles: vi.fn(),
      activateProfile,
    })

    const onSelectProfile = vi.fn()

    const tree = TestRenderer.create(
      <ProfilePickerScreen onSelectProfile={onSelectProfile} onLogout={vi.fn(async () => undefined)} />,
    )

    const profileButton = tree.root.find(
      (node) => node.props?.accessibilityLabel === "Open profile Cafe",
    )

    await TestRenderer.act(async () => {
      await profileButton.props.onPress()
    })

    expect(activateProfile).toHaveBeenCalledWith("profile-2")
    expect(onSelectProfile).toHaveBeenCalledWith(baseProfiles[1])
  })
})
