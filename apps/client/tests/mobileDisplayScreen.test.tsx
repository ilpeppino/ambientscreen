import type { Profile } from "@ambient/shared-contracts"
import React from "react"
import TestRenderer from "react-test-renderer"
import { beforeEach, describe, expect, test, vi } from "vitest"
import { MobileDisplayScreen } from "../src/features/mobile/screens/MobileDisplayScreen"

const enableDisplayKeepAwake = vi.fn()
const disableDisplayKeepAwake = vi.fn()
const lockDisplayLandscape = vi.fn()
const unlockDisplayOrientation = vi.fn()
const listSlides = vi.fn(async () => ({ slides: [] }))
const useDisplayData = vi.fn(() => ({ widgets: [], loadingLayout: false, error: null }))
const useSlidePlayback = vi.fn(() => ({ currentSlide: null, timing: null, activeSlideCount: 0 }))

vi.mock("../src/features/display/services/keepAwake", () => ({
  enableDisplayKeepAwake,
  disableDisplayKeepAwake,
}))

vi.mock("../src/features/display/services/orientation", () => ({
  lockDisplayLandscape,
  unlockDisplayOrientation,
}))

vi.mock("../src/services/api/slidesApi", () => ({
  listSlides,
}))

vi.mock("../src/features/display/hooks/useDisplayData", () => ({
  useDisplayData,
}))

vi.mock("../src/features/display/hooks/useSlidePlayback", () => ({
  useSlidePlayback,
}))

vi.mock("../src/features/display/components/LayoutGrid", () => ({
  LayoutGrid: () => React.createElement("layout-grid"),
}))

vi.mock("../src/widgets/registerBuiltinPlugins", () => ({
  registerBuiltinWidgetPlugins: () => undefined,
}))

const profile: Profile = {
  id: "profile-1",
  userId: "user-1",
  name: "Lobby",
  isDefault: true,
  createdAt: "2026-03-01T00:00:00.000Z",
  defaultSlideDurationSeconds: 20,
}

beforeEach(() => {
  vi.useFakeTimers()
  vi.clearAllMocks()
  useDisplayData.mockReturnValue({ widgets: [], loadingLayout: false, error: null })
  useSlidePlayback.mockReturnValue({ currentSlide: null, timing: null, activeSlideCount: 0 })
  listSlides.mockResolvedValue({ slides: [] })
})

describe("MobileDisplayScreen", () => {
  test("enables orientation and keep-awake lifecycle while mounted", () => {
    const tree = TestRenderer.create(
      <MobileDisplayScreen profile={profile} onExit={vi.fn()} onUnauthorized={vi.fn(async () => undefined)} />,
    )

    expect(enableDisplayKeepAwake).toHaveBeenCalledTimes(1)
    expect(lockDisplayLandscape).toHaveBeenCalledTimes(1)

    tree.unmount()

    expect(disableDisplayKeepAwake).toHaveBeenCalledTimes(1)
    expect(unlockDisplayOrientation).toHaveBeenCalledTimes(1)
  })

  test("tap reveals Exit and auto-hides it after 5 seconds", async () => {
    const tree = TestRenderer.create(
      <MobileDisplayScreen profile={profile} onExit={vi.fn()} onUnauthorized={vi.fn(async () => undefined)} />,
    )

    expect(() => tree.root.findByProps({ accessibilityLabel: "Exit display mode" })).toThrow()

    const surface = tree.root.findByProps({ accessibilityLabel: "Display mode surface" })

    await TestRenderer.act(async () => {
      surface.props.onPress()
    })

    expect(tree.root.findByProps({ accessibilityLabel: "Exit display mode" })).toBeDefined()

    await TestRenderer.act(async () => {
      vi.advanceTimersByTime(5000)
    })

    expect(() => tree.root.findByProps({ accessibilityLabel: "Exit display mode" })).toThrow()
  })

  test("tapping Exit calls onExit", async () => {
    const onExit = vi.fn()
    const tree = TestRenderer.create(
      <MobileDisplayScreen profile={profile} onExit={onExit} onUnauthorized={vi.fn(async () => undefined)} />,
    )

    const surface = tree.root.findByProps({ accessibilityLabel: "Display mode surface" })

    await TestRenderer.act(async () => {
      surface.props.onPress()
    })

    const exitButton = tree.root.findByProps({ accessibilityLabel: "Exit display mode" })

    await TestRenderer.act(async () => {
      exitButton.props.onPress()
    })

    expect(onExit).toHaveBeenCalledTimes(1)
  })
})
