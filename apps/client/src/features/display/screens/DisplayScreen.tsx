import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from "react-native";
import { getWidgets, type WidgetInstance } from "../../../services/api/widgetsApi";
import {
  getWidgetData,
  type WidgetDataEnvelope,
} from "../../../services/api/widgetDataApi";
import type {
  WidgetDataByKey,
  WidgetKey,
} from "@ambient/shared-contracts";
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
  getDisplayStatusModel,
  getDisplayFrameModel,
  resolveDisplayUiState,
  selectDisplayWidget,
} from "../displayScreen.logic";
import { renderWidgetFromEnvelope } from "../../../widgets/widget.registry";
import { createDisplayRefreshEngine } from "../displayRefresh.engine";

interface DisplayScreenProps {
  onExitDisplayMode?: () => void;
}

export function DisplayScreen({ onExitDisplayMode }: DisplayScreenProps) {
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<WidgetInstance | null>(null);
  type WidgetEnvelope =
    | WidgetDataEnvelope<WidgetDataByKey["clockDate"], "clockDate">
    | WidgetDataEnvelope<WidgetDataByKey["weather"], "weather">
    | WidgetDataEnvelope<WidgetDataByKey["calendar"], "calendar">;
  const [widgetData, setWidgetData] =
    useState<WidgetEnvelope | null>(null);
  const [loadingWidgets, setLoadingWidgets] = useState(true);
  const [loadingWidgetData, setLoadingWidgetData] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const refreshEngine = useMemo(() => createDisplayRefreshEngine(), []);

  const selectedWidgetId = selectedWidget?.id ?? null;

  useEffect(() => {
    enableDisplayKeepAwake();
    lockDisplayLandscape();

    return () => {
      disableDisplayKeepAwake();
      unlockDisplayOrientation();
    };
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadWidgets() {
      try {
        setLoadingWidgets(true);
        setError(null);

        const response = await getWidgets();
        if (cancelled) {
          return;
        }

        setWidgets(response);

        setSelectedWidget((previous) => selectDisplayWidget(response, previous));
      } catch (err) {
        if (cancelled) {
          return;
        }
        console.error(err);
        setWidgets([]);
        setSelectedWidget(null);
        setError("Failed to load widgets");
      } finally {
        if (!cancelled) {
          setLoadingWidgets(false);
        }
      }
    }

    loadWidgets();

    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!selectedWidgetId) {
      refreshEngine.stop();
      setWidgetData(null);
      setLoadingWidgetData(false);
      return;
    }

    if (!selectedWidget?.type) {
      refreshEngine.stop();
      return;
    }
    const widgetId = selectedWidgetId;
    const widgetType = selectedWidget.type;
    let cancelled = false;

    async function loadWidgetData() {
      try {
        if (cancelled) {
          return;
        }
        setLoadingWidgetData(true);
        setError(null);

        const response = await getWidgetData<
          WidgetDataByKey[WidgetKey]
        >(widgetId);
        if (cancelled) {
          return;
        }
        setWidgetData(response as WidgetEnvelope);
      } catch (err) {
        if (cancelled) {
          return;
        }
        console.error(err);
        setError("Failed to load widget data");
      } finally {
        if (!cancelled) {
          setLoadingWidgetData(false);
        }
      }
    }

    setWidgetData(null);
    refreshEngine.start({
      widgetInstanceId: widgetId,
      widgetType,
      onRefresh: () => {
        void loadWidgetData();
      },
    });

    return () => {
      cancelled = true;
      refreshEngine.stop();
    };
  }, [refreshEngine, selectedWidgetId, selectedWidget?.type]);

  const uiState = resolveDisplayUiState({
    loadingWidgets,
    loadingWidgetData,
    hasError: !!error,
    hasSelectedWidget: !!selectedWidget,
    hasWidgetData: !!widgetData,
  });

  const frameModel = getDisplayFrameModel(selectedWidget?.type);
  const statusModel = uiState === "ready" ? null : getDisplayStatusModel(uiState, error);

  const content = useMemo(() => {
    if (uiState === "ready" && widgetData) {
      return renderWidgetFromEnvelope(widgetData);
    }

    if (!statusModel) {
      return null;
    }

    const statusBadgeStyle =
      statusModel.tone === "error" ? styles.statusBadgeError : styles.statusBadgeNeutral;
    const statusTitleStyle =
      statusModel.tone === "error" ? styles.statusTitleError : styles.statusTitle;

    return (
      <View style={styles.centered}>
        <View style={styles.statusCard}>
          {statusModel.showSpinner ? (
            <ActivityIndicator size="large" color="#fff" />
          ) : (
            <View style={[styles.statusBadge, statusBadgeStyle]}>
              <Text style={styles.statusBadgeText}>!</Text>
            </View>
          )}
          <Text style={statusTitleStyle}>{statusModel.title}</Text>
          <Text style={styles.statusMessage}>{statusModel.message}</Text>
        </View>
      </View>
    );
  }, [statusModel, uiState, widgetData]);

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
        footer={<Text style={styles.footerText}>{frameModel.footerLabel}</Text>}
      >
        {content}
      </DisplayFrame>
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
  statusBadgeError: {
    backgroundColor: "rgba(255, 107, 107, 0.14)",
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
  statusTitleError: {
    marginTop: 16,
    fontSize: 32,
    lineHeight: 38,
    fontWeight: "700",
    color: "#ff9b9b",
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
