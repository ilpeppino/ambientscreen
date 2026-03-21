import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  getDisplayLayout,
  type DisplayLayoutWidgetEnvelope,
  updateWidgetsLayout,
} from "../../../services/api/displayLayoutApi";
import {
  disableDisplayKeepAwake,
  enableDisplayKeepAwake,
} from "../services/keepAwake";
import {
  lockDisplayLandscape,
  unlockDisplayOrientation,
} from "../services/orientation";
import { DisplayFrame } from "../../../shared/ui/layout/DisplayFrame";
import {
  getDisplayFrameModel,
  getDisplayRefreshIntervalMs,
  getDisplayStatusModel,
} from "../displayScreen.logic";
import { LayoutGrid } from "../components/LayoutGrid";
import { clampWidgetLayout, type WidgetLayout } from "../components/LayoutGrid.logic";

interface DisplayScreenProps {
  onExitDisplayMode?: () => void;
}

const FALLBACK_REFRESH_INTERVAL_MS = 30000;

export function DisplayScreen({ onExitDisplayMode }: DisplayScreenProps) {
  const [widgets, setWidgets] = useState<DisplayLayoutWidgetEnvelope[]>([]);
  const [draftLayoutsByWidgetId, setDraftLayoutsByWidgetId] = useState<Record<string, WidgetLayout>>({});
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [savingLayout, setSavingLayout] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    enableDisplayKeepAwake();
    lockDisplayLandscape();

    return () => {
      disableDisplayKeepAwake();
      unlockDisplayOrientation();
    };
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

  const loadDisplayLayout = useCallback(async (showInitialLoading: boolean) => {
    try {
      if (showInitialLoading) {
        setLoadingLayout(true);
      }

      const response = await getDisplayLayout();
      setWidgets(response.widgets);
      setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(response.widgets));
      setError(null);
    } catch (err) {
      console.error(err);
      setError(toErrorMessage(err, "Failed to load display layout"));
      if (showInitialLoading) {
        setWidgets([]);
      }
    } finally {
      if (showInitialLoading) {
        setLoadingLayout(false);
      }
    }
  }, []);

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
  }, [loadDisplayLayout]);

  useEffect(() => {
    if (editMode) {
      return () => undefined;
    }

    const intervalId = setInterval(() => {
      void loadDisplayLayout(false);
    }, refreshIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [editMode, loadDisplayLayout, refreshIntervalMs]);

  const layoutWidgets = useMemo<DisplayLayoutWidgetEnvelope[]>(() => {
    if (!editMode) {
      return widgets;
    }

    return widgets.map((widget) => ({
      ...widget,
      layout: draftLayoutsByWidgetId[widget.widgetInstanceId] ?? widget.layout,
    }));
  }, [draftLayoutsByWidgetId, editMode, widgets]);

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

  const handleToggleEditMode = useCallback(() => {
    setError(null);
    setEditMode((current) => {
      if (!current) {
        setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(widgets));
      } else {
        setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(widgets));
        setSelectedWidgetId(null);
      }

      return !current;
    });
  }, [widgets]);

  const handleWidgetLayoutChange = useCallback((widgetId: string, layout: WidgetLayout) => {
    setDraftLayoutsByWidgetId((current) => ({
      ...current,
      [widgetId]: clampWidgetLayout({ layout }),
    }));
  }, []);

  const handleCancelLayout = useCallback(() => {
    setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(widgets));
    setSelectedWidgetId(null);
    setEditMode(false);
    setError(null);
  }, [widgets]);

  const handleSaveLayout = useCallback(async () => {
    if (!hasLayoutChanges || savingLayout) {
      return;
    }

    try {
      setSavingLayout(true);
      setError(null);

      await updateWidgetsLayout({
        widgets: widgets.map((widget) => ({
          id: widget.widgetInstanceId,
          layout: clampWidgetLayout({
            layout: draftLayoutsByWidgetId[widget.widgetInstanceId] ?? widget.layout,
          }),
        })),
      });

      await loadDisplayLayout(false);
      setEditMode(false);
      setSelectedWidgetId(null);
    } catch (err) {
      console.error(err);
      setError(toErrorMessage(err, "Failed to save display layout"));
    } finally {
      setSavingLayout(false);
    }
  }, [draftLayoutsByWidgetId, hasLayoutChanges, loadDisplayLayout, savingLayout, widgets]);

  const frameModel = getDisplayFrameModel(undefined);
  const hasWidgets = widgets.length > 0;

  const content = useMemo(() => {
    if (loadingLayout && !hasWidgets) {
      const model = getDisplayStatusModel("loadingWidgets", null);
      return <DisplayStatusCard title={model.title} message={model.message} showSpinner />;
    }

    if (!hasWidgets && error) {
      const model = getDisplayStatusModel("error", error);
      return <DisplayStatusCard title={model.title} message={model.message} />;
    }

    if (!hasWidgets) {
      const model = getDisplayStatusModel("empty", null);
      return <DisplayStatusCard title={model.title} message={model.message} />;
    }

    return (
      <LayoutGrid
        widgets={layoutWidgets}
        editMode={editMode}
        selectedWidgetId={selectedWidgetId}
        onSelectWidget={setSelectedWidgetId}
        onWidgetLayoutChange={handleWidgetLayoutChange}
      />
    );
  }, [editMode, error, handleWidgetLayoutChange, hasWidgets, layoutWidgets, loadingLayout, selectedWidgetId]);

  return (
    <View style={styles.screen}>
      {onExitDisplayMode ? (
        <View style={styles.exitButtonContainer}>
          <Pressable
            accessibilityRole="button"
            style={styles.exitButton}
            onPress={onExitDisplayMode}
          >
            <Text style={styles.exitButtonLabel}>Exit Display</Text>
          </Pressable>
        </View>
      ) : null}
      <View style={styles.editModeButtonContainer}>
        <Pressable
          accessibilityRole="button"
          style={[styles.editModeButton, editMode ? styles.editModeButtonActive : null]}
          onPress={handleToggleEditMode}
        >
          <Text style={styles.editModeButtonLabel}>{editMode ? "Done Editing" : "Edit Layout"}</Text>
        </Pressable>
      </View>
      {editMode ? (
        <View style={styles.layoutActionsContainer}>
          <Pressable
            accessibilityRole="button"
            style={[styles.layoutActionButton, styles.layoutCancelButton]}
            onPress={handleCancelLayout}
            disabled={savingLayout}
          >
            <Text style={styles.layoutActionLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.layoutActionButton,
              styles.layoutSaveButton,
              !hasLayoutChanges || savingLayout ? styles.layoutActionDisabled : null,
            ]}
            onPress={handleSaveLayout}
            disabled={!hasLayoutChanges || savingLayout}
          >
            <Text style={styles.layoutActionLabel}>{savingLayout ? "Saving..." : "Save Layout"}</Text>
          </Pressable>
        </View>
      ) : null}
      <DisplayFrame
        title={frameModel.title}
        subtitle={frameModel.subtitle}
        footer={<Text style={styles.footerText}>{hasWidgets ? `${widgets.length} widgets live` : frameModel.footerLabel}</Text>}
      >
        {content}
      </DisplayFrame>
    </View>
  );
}

interface DisplayStatusCardProps {
  title: string;
  message: string;
  showSpinner?: boolean;
}

function DisplayStatusCard({ title, message, showSpinner = false }: DisplayStatusCardProps) {
  return (
    <View style={styles.centered}>
      <View style={styles.statusCard}>
        {showSpinner ? (
          <ActivityIndicator size="large" color="#fff" />
        ) : (
          <View style={[styles.statusBadge, styles.statusBadgeNeutral]}>
            <Text style={styles.statusBadgeText}>!</Text>
          </View>
        )}
        <Text style={styles.statusTitle}>{title}</Text>
        <Text style={styles.statusMessage}>{message}</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
  },
  exitButtonContainer: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 20,
  },
  exitButton: {
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(0, 0, 0, 0.86)",
  },
  exitButtonLabel: {
    color: "#d8d8d8",
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  statusCard: {
    width: "100%",
    maxWidth: 560,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: "#1f1f1f",
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadge: {
    width: 40,
    height: 40,
    borderRadius: 999,
    alignItems: "center",
    justifyContent: "center",
  },
  statusBadgeNeutral: {
    backgroundColor: "rgba(255, 255, 255, 0.1)",
  },
  statusBadgeText: {
    color: "#ff7d7d",
    fontSize: 22,
    fontWeight: "700",
  },
  statusTitle: {
    marginTop: 16,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    color: "#fff",
    textAlign: "center",
  },
  statusMessage: {
    marginTop: 10,
    fontSize: 18,
    lineHeight: 26,
    color: "#c8c8c8",
    textAlign: "center",
  },
  footerText: {
    color: "#8d8d8d",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  editModeButtonContainer: {
    position: "absolute",
    top: 18,
    right: 130,
    zIndex: 20,
  },
  editModeButton: {
    borderWidth: 1,
    borderColor: "#356084",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(12, 30, 45, 0.9)",
  },
  editModeButtonActive: {
    borderColor: "#5DAEFF",
    backgroundColor: "rgba(20, 52, 82, 0.95)",
  },
  editModeButtonLabel: {
    color: "#b8ddff",
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  layoutActionsContainer: {
    position: "absolute",
    top: 18,
    left: 20,
    zIndex: 20,
    flexDirection: "row",
    gap: 10,
  },
  layoutActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  layoutCancelButton: {
    borderColor: "#575757",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  layoutSaveButton: {
    borderColor: "#5DAEFF",
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  layoutActionDisabled: {
    opacity: 0.45,
  },
  layoutActionLabel: {
    color: "#e4f2ff",
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
});

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function buildLayoutsByWidgetId(
  widgets: DisplayLayoutWidgetEnvelope[],
): Record<string, WidgetLayout> {
  return widgets.reduce<Record<string, WidgetLayout>>((accumulator, widget) => {
    accumulator[widget.widgetInstanceId] = widget.layout;
    return accumulator;
  }, {});
}
