import { useCallback, useEffect, useMemo, useState } from "react";
import type { SlideRecord } from "../../../services/api/slidesApi";

export const DEFAULT_SLIDE_DURATION_SECONDS = 30;

// Pure helpers — exported for testing.

/** Returns only the slides that have isEnabled = true. */
export function filterEnabledSlides(slides: SlideRecord[]): SlideRecord[] {
  return slides.filter((s) => s.isEnabled);
}

/** Returns the playback duration in milliseconds for a slide, with fallback. */
export function getEffectiveDurationMs(slide: SlideRecord | null): number {
  return (slide?.durationSeconds ?? DEFAULT_SLIDE_DURATION_SECONDS) * 1000;
}

/** Returns the index of the next slide in a circular sequence. */
export function advanceSlideIndex(currentIndex: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return (currentIndex + 1) % totalSlides;
}

interface UseSlidePlaybackOptions {
  slides: SlideRecord[];
  enabled: boolean;
}

interface UseSlidePlaybackReturn {
  currentSlide: SlideRecord | null;
  currentIndex: number;
  goToSlide: (index: number) => void;
}

/**
 * Manages timed slide rotation for display mode.
 *
 * - Filters to enabled slides only.
 * - Advances on a per-slide timeout using Slide.durationSeconds,
 *   falling back to DEFAULT_SLIDE_DURATION_SECONDS (30s).
 * - Resets to index 0 when the slide set changes (e.g. profile switch).
 * - When there is only one enabled slide, no timer fires.
 */
export function useSlidePlayback({
  slides,
  enabled,
}: UseSlidePlaybackOptions): UseSlidePlaybackReturn {
  const enabledSlides = useMemo(
    () => slides.filter((s) => s.isEnabled),
    [slides],
  );

  const [currentIndex, setCurrentIndex] = useState(0);

  // Reset to the first slide whenever the enabled slide set is replaced
  // (e.g., profile switch delivers a completely new set of slides).
  const firstSlideId = enabledSlides[0]?.id ?? null;
  useEffect(() => {
    setCurrentIndex(0);
  }, [firstSlideId]);

  const safeIndex =
    enabledSlides.length > 0 ? currentIndex % enabledSlides.length : 0;
  const currentSlide = enabledSlides[safeIndex] ?? null;

  // Per-slide timeout that advances to the next enabled slide.
  // Uses setTimeout (not setInterval) so each slide can have a distinct duration.
  useEffect(() => {
    if (!enabled || enabledSlides.length <= 1) {
      return () => undefined;
    }

    const durationMs =
      (currentSlide?.durationSeconds ?? DEFAULT_SLIDE_DURATION_SECONDS) * 1000;

    const timer = setTimeout(() => {
      setCurrentIndex((i) => (i + 1) % enabledSlides.length);
    }, durationMs);

    return () => {
      clearTimeout(timer);
    };
  }, [enabled, enabledSlides, safeIndex, currentSlide?.durationSeconds]);

  const goToSlide = useCallback(
    (index: number) => {
      if (enabledSlides.length === 0) return;
      setCurrentIndex(
        Math.max(0, Math.min(index, enabledSlides.length - 1)),
      );
    },
    [enabledSlides.length],
  );

  return { currentSlide, currentIndex: safeIndex, goToSlide };
}
