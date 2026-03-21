import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import {
  getDisplayLayout,
  type DisplayLayoutWidgetEnvelope,
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

interface DisplayScreenProps {
  onExitDisplayMode?: () => void;
}

const FALLBACK_REFRESH_INTERVAL_MS = 30000;

export function DisplayScreen({ onExitDisplayMode }: DisplayScreenProps) {
  const [widgets, setWidgets] = useState<DisplayLayoutWidgetEnvelope[]>([]);
  const [loadingLayout, setLoadingLayout] = useState(true);
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
    const intervalId = setInterval(() => {
      void loadDisplayLayout(false);
    }, refreshIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [loadDisplayLayout, refreshIntervalMs]);

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

    return <LayoutGrid widgets={widgets} />;
  }, [error, hasWidgets, loadingLayout, widgets]);

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
});

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
