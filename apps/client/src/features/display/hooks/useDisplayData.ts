import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  getDisplayLayout,
  type DisplayLayoutResponse,
  type DisplaySlideEnvelope,
  type DisplayLayoutWidgetEnvelope,
  updateWidgetsLayout,
} from "../../../services/api/displayLayoutApi";
import {
  getDisplayRefreshIntervalMs,
  getEffectivePollingIntervalMs,
} from "../displayScreen.logic";
import {
  normalizeWidgetLayouts,
  type WidgetLayout,
} from "../components/LayoutGrid.logic";
import type { RealtimeConnectionState } from "../services/realtimeClient";

const FALLBACK_REFRESH_INTERVAL_MS = 30000;

interface UseDisplayDataOptions {
  effectiveActiveProfileId: string | null | undefined;
  editMode: boolean;
  isAppActive: boolean;
  realtimeConnectionState: RealtimeConnectionState;
}

interface UseDisplayDataReturn {
  activeSlide: DisplaySlideEnvelope | null;
  widgets: DisplayLayoutWidgetEnvelope[];
  setWidgets: React.Dispatch<React.SetStateAction<DisplayLayoutWidgetEnvelope[]>>;
  loadingLayout: boolean;
  error: string | null;
  setError: React.Dispatch<React.SetStateAction<string | null>>;
  loadDisplayLayout: (showInitialLoading: boolean) => Promise<void>;
  loadDisplayLayoutRef: React.MutableRefObject<(showInitialLoading: boolean) => Promise<void>>;
  saveWidgetLayouts: (
    widgetLayouts: { id: string; layout: WidgetLayout }[],
    profileId: string | undefined,
  ) => Promise<void>;
}

export function useDisplayData({
  effectiveActiveProfileId,
  editMode,
  isAppActive,
  realtimeConnectionState,
}: UseDisplayDataOptions): UseDisplayDataReturn {
  const [activeSlide, setActiveSlide] = useState<DisplaySlideEnvelope | null>(null);
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const widgets = activeSlide?.widgets ?? [];

  const setWidgets = useCallback<React.Dispatch<React.SetStateAction<DisplayLayoutWidgetEnvelope[]>>>((value) => {
    setActiveSlide((current) => {
      const previousWidgets = current?.widgets ?? [];
      const nextWidgets = typeof value === "function" ? value(previousWidgets) : value;

      if (!current) {
        return createDefaultSlide(nextWidgets);
      }

      return {
        ...current,
        widgets: nextWidgets,
      };
    });
  }, []);

  const refreshIntervalMs = useMemo(() => {
    const intervals = widgets
      .map((widget) => getDisplayRefreshIntervalMs(widget.widgetKey))
      .filter((interval): interval is number => interval !== null);

    if (intervals.length === 0) {
      return FALLBACK_REFRESH_INTERVAL_MS;
    }

    return Math.min(...intervals);
  }, [widgets]);

  const effectivePollingIntervalMs = useMemo(
    () => getEffectivePollingIntervalMs(refreshIntervalMs, realtimeConnectionState),
    [refreshIntervalMs, realtimeConnectionState],
  );

  const loadDisplayLayout = useCallback(async (showInitialLoading: boolean) => {
    if (!effectiveActiveProfileId) {
      setActiveSlide(null);
      setLoadingLayout(false);
      return;
    }

    try {
      if (showInitialLoading) {
        setLoadingLayout(true);
      }

      const response = await getDisplayLayout(effectiveActiveProfileId);
      setActiveSlide(resolveSlideComposition(response));
      setError(null);
    } catch (err) {
      console.error(err);
      setError(toErrorMessage(err, "Failed to load display layout"));
      if (showInitialLoading) {
        setActiveSlide(null);
      }
    } finally {
      if (showInitialLoading) {
        setLoadingLayout(false);
      }
    }
  }, [effectiveActiveProfileId]);

  const loadDisplayLayoutRef = useRef(loadDisplayLayout);
  loadDisplayLayoutRef.current = loadDisplayLayout;

  // Initial load on profile change
  useEffect(() => {
    let cancelled = false;

    async function runInitialLoad() {
      if (cancelled) {
        return;
      }

      await loadDisplayLayout(true);
    }

    void runInitialLoad();

    return () => {
      cancelled = true;
    };
  }, [effectiveActiveProfileId, loadDisplayLayout]);

  // Polling interval — paused when editing or backgrounded
  useEffect(() => {
    if (editMode || !isAppActive) {
      return () => undefined;
    }

    const intervalId = setInterval(() => {
      void loadDisplayLayout(false);
    }, effectivePollingIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [editMode, effectivePollingIntervalMs, isAppActive, loadDisplayLayout]);

  const saveWidgetLayouts = useCallback(async (
    widgetLayouts: { id: string; layout: WidgetLayout }[],
    profileId: string | undefined,
  ) => {
    await updateWidgetsLayout({ widgets: widgetLayouts }, profileId);
  }, []);

  return {
    activeSlide,
    widgets,
    setWidgets,
    loadingLayout,
    error,
    setError,
    loadDisplayLayout,
    loadDisplayLayoutRef,
    saveWidgetLayouts,
  };
}

export function buildLayoutsByWidgetId(
  widgets: DisplayLayoutWidgetEnvelope[],
): Record<string, WidgetLayout> {
  return widgets.reduce<Record<string, WidgetLayout>>((accumulator, widget) => {
    accumulator[widget.widgetInstanceId] = widget.layout;
    return accumulator;
  }, {});
}

export function withNormalizedLayouts(
  widgets: DisplayLayoutWidgetEnvelope[],
): DisplayLayoutWidgetEnvelope[] {
  const orderedWidgetIds = widgets.map((widget) => widget.widgetInstanceId);
  const normalizedLayoutsByWidgetId = normalizeWidgetLayouts({
    layoutsById: buildLayoutsByWidgetId(widgets),
    orderedWidgetIds,
  });

  return widgets.map((widget) => ({
    ...widget,
    layout: normalizedLayoutsByWidgetId[widget.widgetInstanceId] ?? widget.layout,
  }));
}

export function resolveSlideComposition(response: DisplayLayoutResponse): DisplaySlideEnvelope {
  if (response.slide) {
    return {
      ...response.slide,
      widgets: withNormalizedLayouts(response.slide.widgets),
    };
  }

  return createDefaultSlide(withNormalizedLayouts(response.widgets));
}

function createDefaultSlide(widgets: DisplayLayoutWidgetEnvelope[]): DisplaySlideEnvelope {
  return {
    id: "default-slide-v0",
    name: "Default",
    order: 0,
    durationSeconds: null,
    isEnabled: true,
    widgets,
  };
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
