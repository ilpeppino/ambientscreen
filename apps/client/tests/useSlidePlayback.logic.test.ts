import { expect, test } from "vitest";
import {
  advanceSlideIndex,
  DEFAULT_SLIDE_DURATION_SECONDS,
  filterEnabledSlides,
  getEffectiveDurationMs,
} from "../src/features/display/hooks/useSlidePlayback";
import type { SlideRecord } from "../src/services/api/slidesApi";

function makeSlide(
  id: string,
  durationSeconds: number | null = null,
  isEnabled = true,
): SlideRecord {
  return {
    id,
    profileId: "profile-1",
    name: id,
    order: 0,
    durationSeconds,
    isEnabled,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    itemCount: 0,
  };
}

// --- filterEnabledSlides ---

test("filterEnabledSlides returns all slides when all are enabled", () => {
  const slides = [makeSlide("s1"), makeSlide("s2"), makeSlide("s3")];
  expect(filterEnabledSlides(slides)).toHaveLength(3);
});

test("filterEnabledSlides removes disabled slides", () => {
  const slides = [makeSlide("s1"), makeSlide("s2", null, false), makeSlide("s3")];
  const result = filterEnabledSlides(slides);
  expect(result).toHaveLength(2);
  expect(result.map((s) => s.id)).toEqual(["s1", "s3"]);
});

test("filterEnabledSlides returns empty array when all disabled", () => {
  const slides = [makeSlide("s1", null, false), makeSlide("s2", null, false)];
  expect(filterEnabledSlides(slides)).toHaveLength(0);
});

// --- getEffectiveDurationMs ---

test("getEffectiveDurationMs uses slide durationSeconds when set", () => {
  const slide = makeSlide("s1", 15);
  expect(getEffectiveDurationMs(slide)).toBe(15000);
});

test("getEffectiveDurationMs falls back to DEFAULT when durationSeconds is null", () => {
  const slide = makeSlide("s1", null);
  expect(getEffectiveDurationMs(slide)).toBe(DEFAULT_SLIDE_DURATION_SECONDS * 1000);
});

test("getEffectiveDurationMs falls back to DEFAULT when slide is null", () => {
  expect(getEffectiveDurationMs(null)).toBe(DEFAULT_SLIDE_DURATION_SECONDS * 1000);
});

// --- advanceSlideIndex ---

test("advanceSlideIndex increments by one", () => {
  expect(advanceSlideIndex(0, 3)).toBe(1);
  expect(advanceSlideIndex(1, 3)).toBe(2);
});

test("advanceSlideIndex wraps around to 0 at the end", () => {
  expect(advanceSlideIndex(2, 3)).toBe(0);
});

test("advanceSlideIndex returns 0 when totalSlides is 0 or 1", () => {
  expect(advanceSlideIndex(0, 0)).toBe(0);
  expect(advanceSlideIndex(0, 1)).toBe(0);
});

// --- integration: filtering then advancing ---

test("disabled slides are excluded from rotation sequence", () => {
  const raw = [makeSlide("s1"), makeSlide("s2-off", null, false), makeSlide("s3")];
  const enabled = filterEnabledSlides(raw);

  expect(enabled.map((s) => s.id)).toEqual(["s1", "s3"]);

  // After s1, rotation should jump directly to s3.
  const nextIndex = advanceSlideIndex(0, enabled.length);
  expect(enabled[nextIndex]?.id).toBe("s3");
});
