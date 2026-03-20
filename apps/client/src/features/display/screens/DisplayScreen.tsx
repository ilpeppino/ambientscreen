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
  getDisplayFrameModel,
  getDisplayRefreshIntervalMs,
  resolveDisplayUiState,
  selectDisplayWidget,
} from "../displayScreen.logic";
import { renderWidgetFromEnvelope } from "../../../widgets/widget.registry";

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
      return;
    }
    const widgetId = selectedWidgetId;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadWidgetData() {
      try {
        setLoadingWidgetData(true);
        setError(null);

        const response = await getWidgetData<
          WidgetDataByKey[WidgetKey]
        >(widgetId);
        setWidgetData(response as WidgetEnvelope);
      } catch (err) {
        console.error(err);
        setError("Failed to load widget data");
      } finally {
        setLoadingWidgetData(false);
      }
    }

    loadWidgetData();

    const refreshIntervalMs = getDisplayRefreshIntervalMs(selectedWidget?.type);
    if (refreshIntervalMs !== null) {
      intervalId = setInterval(() => {
        loadWidgetData();
      }, refreshIntervalMs);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedWidgetId, selectedWidget?.type]);

  const uiState = resolveDisplayUiState({
    loadingWidgets,
    loadingWidgetData,
    hasError: !!error,
    hasSelectedWidget: !!selectedWidget,
    hasWidgetData: !!widgetData,
  });

  const frameModel = getDisplayFrameModel(selectedWidget?.type);

  const content = useMemo(() => {
    if (uiState === "loadingWidgets") {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.message}>Loading widgets...</Text>
        </View>
      );
    }

    if (uiState === "error") {
      return (
        <View style={styles.centered}>
          <Text style={styles.error}>{error}</Text>
        </View>
      );
    }

    if (uiState === "empty") {
      return (
        <View style={styles.centered}>
          <Text style={styles.message}>No widgets configured yet.</Text>
        </View>
      );
    }

    if (uiState === "loadingWidgetData") {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.message}>Loading widget data...</Text>
        </View>
      );
    }

    if (uiState === "ready" && widgetData) {
      return renderWidgetFromEnvelope(widgetData);
    }

    return (
      <View style={styles.centered}>
        <Text style={styles.message}>
          Unsupported widget type: {selectedWidget?.type}
        </Text>
      </View>
    );
  }, [uiState, error, widgetData, selectedWidget?.type]);

  return (
    <View style={styles.screen}>
      {onExitDisplayMode ? (
        <View style={styles.exitButtonContainer}>
          <Pressable
            accessibilityRole="button"
            style={styles.exitButton}
            onPress={onExitDisplayMode}
          >
            <Text style={styles.exitButtonLabel}>Back to Admin</Text>
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
    top: 12,
    right: 12,
    zIndex: 20,
  },
  exitButton: {
    borderWidth: 1,
    borderColor: "#777",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: "rgba(0, 0, 0, 0.75)",
  },
  exitButtonLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    padding: 24,
    backgroundColor: "#000",
  },
  message: {
    marginTop: 12,
    fontSize: 18,
    color: "#fff",
    textAlign: "center",
  },
  error: {
    fontSize: 18,
    color: "#ff6b6b",
    textAlign: "center",
  },
  footerText: {
    color: "#666",
    fontSize: 12,
  },
});
