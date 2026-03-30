import type { Profile } from "@ambient/shared-contracts"
import React, { useCallback, useEffect, useRef, useState } from "react"
import {
  AppState,
  BackHandler,
  Pressable,
  StatusBar,
  StyleSheet,
  View,
} from "react-native"
import { SafeAreaView, useSafeAreaInsets } from "react-native-safe-area-context"
import { Text } from "../../../shared/ui/components"
import { colors, radius, spacing, typography } from "../../../shared/ui/theme"
import { LayoutGrid } from "../../display/components/LayoutGrid"
import { useDisplayData } from "../../display/hooks/useDisplayData"
import {
  disableDisplayKeepAwake,
  enableDisplayKeepAwake,
} from "../../display/services/keepAwake"
import {
  lockDisplayLandscape,
  unlockDisplayOrientation,
} from "../../display/services/orientation"
import { useSlidePlayback } from "../../display/hooks/useSlidePlayback"
import { listSlides, type SlideRecord } from "../../../services/api/slidesApi"
import { isUnauthorizedApiError } from "../../../services/api/apiClient"
import { registerBuiltinWidgetPlugins } from "../../../widgets/registerBuiltinPlugins"

const EXIT_HIDE_DELAY_MS = 5000

interface MobileDisplayScreenProps {
  profile: Profile
  onExit: () => void
  onUnauthorized: () => Promise<void>
}

export function MobileDisplayScreen({ profile, onExit, onUnauthorized }: MobileDisplayScreenProps) {
  registerBuiltinWidgetPlugins()

  const insets = useSafeAreaInsets()
  const hideExitTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showExitButton, setShowExitButton] = useState(false)
  const [isAppActive, setIsAppActive] = useState(AppState.currentState === "active")
  const [slides, setSlides] = useState<SlideRecord[]>([])
  const [slidesError, setSlidesError] = useState<string | null>(null)

  const { currentSlide, timing, activeSlideCount } = useSlidePlayback({
    slides,
    enabled: isAppActive,
    defaultSlideDurationSeconds: profile.defaultSlideDurationSeconds,
  })

  const displayData = useDisplayData({
    effectiveActiveProfileId: profile.id,
    slideId: currentSlide?.id ?? null,
    editMode: false,
    isAppActive,
    realtimeConnectionState: "disconnected",
    onUnauthorized,
  })

  const { widgets, loadingLayout, error } = displayData

  const clearExitHideTimer = useCallback(() => {
    if (!hideExitTimerRef.current) {
      return
    }

    clearTimeout(hideExitTimerRef.current)
    hideExitTimerRef.current = null
  }, [])

  const scheduleExitHide = useCallback(() => {
    clearExitHideTimer()
    hideExitTimerRef.current = setTimeout(() => {
      setShowExitButton(false)
      hideExitTimerRef.current = null
    }, EXIT_HIDE_DELAY_MS)
  }, [clearExitHideTimer])

  const revealExitButton = useCallback(() => {
    setShowExitButton(true)
    scheduleExitHide()
  }, [scheduleExitHide])

  const handleExit = useCallback(() => {
    clearExitHideTimer()
    setShowExitButton(false)
    onExit()
  }, [clearExitHideTimer, onExit])

  useEffect(() => {
    enableDisplayKeepAwake()
    lockDisplayLandscape()

    return () => {
      disableDisplayKeepAwake()
      unlockDisplayOrientation()
    }
  }, [])

  useEffect(() => {
    const appStateSubscription = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active")
    })

    return () => {
      appStateSubscription.remove()
    }
  }, [])

  useEffect(() => {
    const backSubscription = BackHandler.addEventListener("hardwareBackPress", () => {
      handleExit()
      return true
    })

    return () => {
      backSubscription.remove()
    }
  }, [handleExit])

  useEffect(() => {
    let cancelled = false

    async function loadSlides() {
      try {
        const response = await listSlides(profile.id)
        if (cancelled) {
          return
        }

        setSlides(response.slides.filter((slide) => slide.isEnabled))
        setSlidesError(null)
      } catch (loadError) {
        if (cancelled) {
          return
        }

        if (isUnauthorizedApiError(loadError)) {
          await onUnauthorized()
          return
        }

        setSlides([])
        setSlidesError(loadError instanceof Error ? loadError.message : "Failed to load slides")
      }
    }

    void loadSlides()

    return () => {
      cancelled = true
    }
  }, [onUnauthorized, profile.id])

  useEffect(() => {
    return () => {
      clearExitHideTimer()
    }
  }, [clearExitHideTimer])

  return (
    <SafeAreaView style={styles.screen}>
      <StatusBar hidden animated />
      <Pressable style={styles.screenTapZone} onPress={revealExitButton} accessibilityLabel="Display mode surface">
        {loadingLayout ? (
          <View style={styles.centeredState}>
            <Text style={styles.stateTitle}>Loading display...</Text>
          </View>
        ) : null}

        {!loadingLayout && (error || slidesError) ? (
          <View style={styles.centeredState}>
            <Text style={styles.stateTitle}>Display unavailable</Text>
            <Text style={styles.stateSubtitle}>{error ?? slidesError}</Text>
          </View>
        ) : null}

        {!loadingLayout && !error && !slidesError ? (
          widgets.length > 0 ? (
            <LayoutGrid widgets={widgets} />
          ) : (
            <View style={styles.centeredState}>
              <Text style={styles.stateTitle}>Profile is empty</Text>
              <Text style={styles.stateSubtitle}>Add widgets from web admin for {profile.name}.</Text>
            </View>
          )
        ) : null}

        {showExitButton ? (
          <View
            style={[
              styles.exitButtonContainer,
              {
                top: insets.top + 12,
                right: Math.max(insets.right, 12),
              },
            ]}
          >
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Exit display mode"
              style={styles.exitButton}
              onPress={handleExit}
            >
              <Text style={styles.exitButtonLabel}>Exit</Text>
            </Pressable>
          </View>
        ) : null}

        {!loadingLayout && !error && !slidesError && activeSlideCount > 0 && timing ? (
          <View style={[styles.slideTimer, { top: insets.top + 8 }]}>
            <Text style={styles.slideTimerLabel}>{Math.max(0, Math.ceil(timing.remainingMs / 1000))}s</Text>
          </View>
        ) : null}
      </Pressable>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  screenTapZone: {
    flex: 1,
  },
  centeredState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.sm,
  },
  stateTitle: {
    ...typography.titleMd,
    color: colors.textPrimary,
    textAlign: "center",
  },
  stateSubtitle: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  exitButtonContainer: {
    position: "absolute",
    zIndex: 40,
  },
  exitButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    backgroundColor: "rgba(10, 12, 16, 0.88)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
  },
  exitButtonLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  slideTimer: {
    position: "absolute",
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 30,
  },
  slideTimerLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    backgroundColor: "rgba(8, 8, 8, 0.68)",
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.sm,
    paddingVertical: 2,
  },
})
