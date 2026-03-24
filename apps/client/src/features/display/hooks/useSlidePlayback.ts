import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { SlideRecord } from "../../../services/api/slidesApi";

export const DEFAULT_SLIDE_DURATION_SECONDS = 30;

interface PlaybackCycle {
  slideId: string;
  startedAtMs: number;
  durationMs: number;
  deadlineMs: number;
}

export interface SlidePlaybackTiming {
  startTimeMs: number;
  durationMs: number;
  elapsedMs: number;
  remainingMs: number;
  progressRemaining: number;
}

// Pure helpers — exported for testing.

/** Returns only the slides that have isEnabled = true. */
export function filterEnabledSlides(slides: SlideRecord[]): SlideRecord[] {
  return slides.filter((s) => s.isEnabled);
}

/** Returns the playback duration in milliseconds for a slide, with fallback. */
export function getEffectiveDurationMs(
  slide: SlideRecord | null,
  defaultSlideDurationSeconds: number = DEFAULT_SLIDE_DURATION_SECONDS,
): number {
  return (slide?.durationSeconds ?? defaultSlideDurationSeconds) * 1000;
}

/** Returns the index of the next slide in a circular sequence. */
export function advanceSlideIndex(currentIndex: number, totalSlides: number): number {
  if (totalSlides <= 0) return 0;
  return (currentIndex + 1) % totalSlides;
}

function buildTimingSnapshot(cycle: PlaybackCycle | null, nowMs: number): SlidePlaybackTiming | null {
  if (!cycle) {
    return null;
  }

  const elapsedMs = Math.max(0, Math.min(nowMs - cycle.startedAtMs, cycle.durationMs));
  const remainingMs = Math.max(0, cycle.deadlineMs - nowMs);
  const progressRemaining = cycle.durationMs > 0 ? remainingMs / cycle.durationMs : 0;

  return {
    startTimeMs: cycle.startedAtMs,
    durationMs: cycle.durationMs,
    elapsedMs,
    remainingMs,
    progressRemaining: Math.max(0, Math.min(1, progressRemaining)),
  };
}

interface UseSlidePlaybackOptions {
  slides: SlideRecord[];
  enabled: boolean;
  defaultSlideDurationSeconds?: number;
}

interface UseSlidePlaybackReturn {
  currentSlide: SlideRecord | null;
  currentIndex: number;
  activeSlideCount: number;
  timing: SlidePlaybackTiming | null;
  goToSlide: (index: number) => void;
}

/**
 * Manages timed slide rotation for display mode.
 *
 * - Filters to enabled slides only.
 * - Resolves duration as slide.durationSeconds -> profile default -> hard fallback.
 * - Uses timestamp-based cycles to avoid drift and to keep UI progress in sync.
 * - Supports pause/resume by carrying remaining time for the current cycle.
 */
export function useSlidePlayback({
  slides,
  enabled,
  defaultSlideDurationSeconds = DEFAULT_SLIDE_DURATION_SECONDS,
}: UseSlidePlaybackOptions): UseSlidePlaybackReturn {
  const enabledSlides = useMemo(() => filterEnabledSlides(slides), [slides]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [cycleNonce, setCycleNonce] = useState(0);
  const [cycle, setCycle] = useState<PlaybackCycle | null>(null);
  const [nowMs, setNowMs] = useState(() => Date.now());

  const pauseStateRef = useRef<{ slideId: string; remainingMs: number } | null>(null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const rafRef = useRef<ReturnType<typeof requestAnimationFrame> | null>(null);

  const firstSlideId = enabledSlides[0]?.id ?? null;
  useEffect(() => {
    setCurrentIndex(0);
    setCycleNonce((value) => value + 1);
  }, [firstSlideId]);

  const safeIndex =
    enabledSlides.length > 0 ? currentIndex % enabledSlides.length : 0;
  const currentSlide = enabledSlides[safeIndex] ?? null;
  const resolvedDurationMs = getEffectiveDurationMs(currentSlide, defaultSlideDurationSeconds);

  useEffect(() => {
    if (!enabled || !cycle || !currentSlide) {
      return;
    }

    const remainingMs = Math.max(0, cycle.deadlineMs - Date.now());
    pauseStateRef.current = {
      slideId: currentSlide.id,
      remainingMs,
    };
  }, [enabled, cycle, currentSlide]);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (!enabled || !currentSlide) {
      setCycle(null);
      return () => undefined;
    }

    const now = Date.now();
    const paused = pauseStateRef.current;
    const canResumePausedCycle = Boolean(
      paused &&
      paused.slideId === currentSlide.id &&
      paused.remainingMs > 0 &&
      paused.remainingMs < resolvedDurationMs,
    );

    const remainingMs = canResumePausedCycle ? paused!.remainingMs : resolvedDurationMs;
    const startedAtMs = now - (resolvedDurationMs - remainingMs);
    const deadlineMs = now + remainingMs;

    setNowMs(now);
    setCycle({
      slideId: currentSlide.id,
      startedAtMs,
      durationMs: resolvedDurationMs,
      deadlineMs,
    });

    pauseStateRef.current = null;

    timeoutRef.current = setTimeout(() => {
      setCurrentIndex((index) => advanceSlideIndex(index, enabledSlides.length));
      setCycleNonce((value) => value + 1);
    }, remainingMs);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, currentSlide?.id, enabledSlides.length, resolvedDurationMs, cycleNonce]);

  useEffect(() => {
    if (!enabled || !cycle) {
      return () => undefined;
    }

    const tick = () => {
      setNowMs(Date.now());
      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [enabled, cycle?.deadlineMs, cycle?.slideId]);

  const goToSlide = useCallback(
    (index: number) => {
      if (enabledSlides.length === 0) return;
      pauseStateRef.current = null;
      setCurrentIndex(Math.max(0, Math.min(index, enabledSlides.length - 1)));
      setCycleNonce((value) => value + 1);
    },
    [enabledSlides.length],
  );

  const timing = useMemo(() => buildTimingSnapshot(cycle, nowMs), [cycle, nowMs]);

  return {
    currentSlide,
    currentIndex: safeIndex,
    activeSlideCount: enabledSlides.length,
    timing,
    goToSlide,
  };
}

