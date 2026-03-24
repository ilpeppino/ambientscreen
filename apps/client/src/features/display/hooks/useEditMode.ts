import { useCallback, useMemo, useState } from "react";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import {
  clampWidgetLayout,
  resolveWidgetLayoutCollision,
  type WidgetLayout,
} from "../components/LayoutGrid.logic";
import { buildLayoutsByWidgetId, withNormalizedLayouts } from "./useDisplayData";

interface UseEditModeOpsOptions {
  editMode: boolean;
  setEditMode: (value: boolean | ((prev: boolean) => boolean)) => void;
  widgets: DisplayLayoutWidgetEnvelope[];
  effectiveActiveProfileId: string | null | undefined;
  saveWidgetLayouts: (
    widgetLayouts: { id: string; layout: WidgetLayout }[],
    profileId: string | undefined,
  ) => Promise<void>;
  onAfterSave?: () => Promise<void>;
}

interface UseEditModeOpsReturn {
  selectedWidgetId: string | null;
  setSelectedWidgetId: React.Dispatch<React.SetStateAction<string | null>>;
  draftLayoutsByWidgetId: Record<string, WidgetLayout>;
  setDraftLayoutsByWidgetId: React.Dispatch<React.SetStateAction<Record<string, WidgetLayout>>>;
  savingLayout: boolean;
  layoutError: string | null;
  setLayoutError: React.Dispatch<React.SetStateAction<string | null>>;
  hasLayoutChanges: boolean;
  layoutWidgets: DisplayLayoutWidgetEnvelope[];
  handleToggleEditMode: () => void;
  handleWidgetLayoutChange: (widgetId: string, layout: WidgetLayout) => void;
  handleCancelLayout: (opts?: { onCleared?: () => void }) => void;
  handleSaveLayout: () => Promise<void>;
}

export function useEditModeOps({
  editMode,
  setEditMode,
  widgets,
  effectiveActiveProfileId,
  saveWidgetLayouts,
  onAfterSave,
}: UseEditModeOpsOptions): UseEditModeOpsReturn {
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [draftLayoutsByWidgetId, setDraftLayoutsByWidgetId] = useState<Record<string, WidgetLayout>>({});
  const [savingLayout, setSavingLayout] = useState(false);
  const [layoutError, setLayoutError] = useState<string | null>(null);

  const hasLayoutChanges = useMemo(() => {
    if (!editMode) {
      return false;
    }

    return widgets.some((widget) => {
      const draftLayout = draftLayoutsByWidgetId[widget.widgetInstanceId];
      if (!draftLayout) {
        return false;
      }

      return (
        draftLayout.x !== widget.layout.x
        || draftLayout.y !== widget.layout.y
        || draftLayout.w !== widget.layout.w
        || draftLayout.h !== widget.layout.h
      );
    });
  }, [draftLayoutsByWidgetId, editMode, widgets]);

  const layoutWidgets = useMemo<DisplayLayoutWidgetEnvelope[]>(() => {
    if (!editMode) {
      return widgets;
    }

    return widgets.map((widget) => ({
      ...widget,
      layout: draftLayoutsByWidgetId[widget.widgetInstanceId] ?? widget.layout,
    }));
  }, [draftLayoutsByWidgetId, editMode, widgets]);

  const handleToggleEditMode = useCallback(() => {
    setLayoutError(null);
    setEditMode((current) => {
      setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(withNormalizedLayouts(widgets)));
      if (current) {
        setSelectedWidgetId(null);
      }
      return !current;
    });
  }, [setEditMode, widgets]);

  const handleWidgetLayoutChange = useCallback((widgetId: string, layout: WidgetLayout) => {
    setDraftLayoutsByWidgetId((current) => {
      const clampedLayout = clampWidgetLayout({ layout });
      const resolvedLayout = resolveWidgetLayoutCollision({
        widgetId,
        proposedLayout: clampedLayout,
        layoutsById: current,
      });

      return {
        ...current,
        [widgetId]: resolvedLayout,
      };
    });
  }, []);

  const handleCancelLayout = useCallback((opts?: { onCleared?: () => void }) => {
    setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(widgets));
    setSelectedWidgetId(null);
    setLayoutError(null);
    opts?.onCleared?.();
    setEditMode(false);
  }, [setEditMode, widgets]);

  const handleSaveLayout = useCallback(async () => {
    if (!hasLayoutChanges || savingLayout) {
      return;
    }

    try {
      setSavingLayout(true);
      setLayoutError(null);

      await saveWidgetLayouts(
        widgets.map((widget) => ({
          id: widget.widgetInstanceId,
          layout: clampWidgetLayout({
            layout: draftLayoutsByWidgetId[widget.widgetInstanceId] ?? widget.layout,
          }),
        })),
        effectiveActiveProfileId ?? undefined,
      );

      await onAfterSave?.();
      setEditMode(false);
      setSelectedWidgetId(null);
    } catch (err) {
      console.error(err);
      setLayoutError(toErrorMessage(err, "Failed to save display layout"));
    } finally {
      setSavingLayout(false);
    }
  }, [
    draftLayoutsByWidgetId,
    effectiveActiveProfileId,
    hasLayoutChanges,
    onAfterSave,
    saveWidgetLayouts,
    savingLayout,
    setEditMode,
    widgets,
  ]);

  return {
    selectedWidgetId,
    setSelectedWidgetId,
    draftLayoutsByWidgetId,
    setDraftLayoutsByWidgetId,
    savingLayout,
    layoutError,
    setLayoutError,
    hasLayoutChanges,
    layoutWidgets,
    handleToggleEditMode,
    handleWidgetLayoutChange,
    handleCancelLayout,
    handleSaveLayout,
  };
}

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
