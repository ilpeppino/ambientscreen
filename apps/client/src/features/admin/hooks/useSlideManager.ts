import { useCallback, useEffect, useState } from "react";
import {
  createSlide,
  deleteSlide,
  listSlides,
  updateSlide,
  type SlideRecord,
} from "../../../services/api/slidesApi";

interface UseSlideManagerReturn {
  slides: SlideRecord[];
  activeSlideId: string | null;
  activeSlide: SlideRecord | null;
  loadingSlides: boolean;
  slidesError: string | null;
  selectSlide: (slideId: string) => void;
  handleCreateSlide: (name: string, durationSeconds?: number | null) => Promise<void>;
  handleRenameSlide: (slideId: string, name: string) => Promise<void>;
  handleDeleteSlide: (slideId: string) => Promise<void>;
  handleUpdateSlideDuration: (slideId: string, durationSeconds: number | null) => Promise<void>;
  handleReorderSlide: (slideId: string, newOrder: number) => Promise<void>;
  reloadSlides: () => Promise<void>;
}

/**
 * Manages the slide list for the admin editor.
 *
 * - Loads slides whenever the profileId changes.
 * - Maintains `activeSlideId`; auto-selects the first slide on load.
 * - If the active slide is deleted, the next available slide is selected automatically.
 * - Exposes handlers for create, rename, delete, duration update, and reorder.
 */
export function useSlideManager(
  profileId: string | null | undefined,
): UseSlideManagerReturn {
  const [slides, setSlides] = useState<SlideRecord[]>([]);
  const [activeSlideId, setActiveSlideId] = useState<string | null>(null);
  const [loadingSlides, setLoadingSlides] = useState(false);
  const [slidesError, setSlidesError] = useState<string | null>(null);

  const reloadSlides = useCallback(async () => {
    if (!profileId) {
      setSlides([]);
      setActiveSlideId(null);
      return;
    }

    try {
      setLoadingSlides(true);
      setSlidesError(null);
      const { slides: fetched } = await listSlides(profileId);
      setSlides(fetched);
      // Keep current selection if still valid; otherwise pick the first slide.
      setActiveSlideId((current) => {
        if (current && fetched.some((s) => s.id === current)) return current;
        return fetched[0]?.id ?? null;
      });
    } catch (err) {
      setSlidesError(
        err instanceof Error ? err.message : "Failed to load slides",
      );
    } finally {
      setLoadingSlides(false);
    }
  }, [profileId]);

  useEffect(() => {
    void reloadSlides();
  }, [reloadSlides]);

  const selectSlide = useCallback((slideId: string) => {
    setActiveSlideId(slideId);
  }, []);

  const handleCreateSlide = useCallback(
    async (name: string, durationSeconds?: number | null) => {
      if (!profileId) return;
      const created = await createSlide(
        { name, durationSeconds: durationSeconds ?? null },
        profileId,
      );
      await reloadSlides();
      // Auto-select the newly created slide.
      setActiveSlideId(created.id);
    },
    [profileId, reloadSlides],
  );

  const handleRenameSlide = useCallback(
    async (slideId: string, name: string) => {
      if (!profileId) return;
      await updateSlide(slideId, { name }, profileId);
      await reloadSlides();
    },
    [profileId, reloadSlides],
  );

  const handleDeleteSlide = useCallback(
    async (slideId: string) => {
      if (!profileId) return;
      // Optimistically clear selection if deleting the active slide so the
      // reloadSlides() call will pick the next available one.
      setActiveSlideId((current) => (current === slideId ? null : current));
      await deleteSlide(slideId, profileId);
      await reloadSlides();
    },
    [profileId, reloadSlides],
  );

  const handleUpdateSlideDuration = useCallback(
    async (slideId: string, durationSeconds: number | null) => {
      if (!profileId) return;
      await updateSlide(slideId, { durationSeconds }, profileId);
      await reloadSlides();
    },
    [profileId, reloadSlides],
  );

  const handleReorderSlide = useCallback(
    async (slideId: string, newOrder: number) => {
      if (!profileId) return;
      await updateSlide(slideId, { order: newOrder }, profileId);
      await reloadSlides();
    },
    [profileId, reloadSlides],
  );

  const activeSlide = slides.find((s) => s.id === activeSlideId) ?? null;

  return {
    slides,
    activeSlideId,
    activeSlide,
    loadingSlides,
    slidesError,
    selectSlide,
    handleCreateSlide,
    handleRenameSlide,
    handleDeleteSlide,
    handleUpdateSlideDuration,
    handleReorderSlide,
    reloadSlides,
  };
}
