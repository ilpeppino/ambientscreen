import React, { useEffect, useMemo, useState } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import { getWidgets, type WidgetInstance } from "../../../services/api/widgetsApi";
import {
  getWidgetData,
  type ClockDateWidgetData,
  type WidgetDataEnvelope,
} from "../../../services/api/widgetDataApi";
import { ClockDateRenderer } from "../../../widgets/clockDate/renderer";
import {
  disableDisplayKeepAwake,
  enableDisplayKeepAwake,
} from "../services/keepAwake";
import {
  lockDisplayLandscape,
  unlockDisplayOrientation,
} from "../services/orientation";
import { DisplayFrame } from "../../../shared/ui/layout/DisplayFrame";

export function DisplayScreen() {
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [selectedWidget, setSelectedWidget] = useState<WidgetInstance | null>(null);
  const [widgetData, setWidgetData] =
    useState<WidgetDataEnvelope<ClockDateWidgetData> | null>(null);
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

        const defaultWidget =
          response.find((widget) => widget.type === "clockDate") ??
          response[0] ??
          null;

        setSelectedWidget((previous) => {
          if (!previous) {
            return defaultWidget;
          }

          const stillExists = response.find((widget) => widget.id === previous.id);
          return stillExists ?? defaultWidget;
        });
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
    const widgetId = selectedWidgetId as string;

    let intervalId: ReturnType<typeof setInterval> | null = null;

    async function loadWidgetData() {
      try {
        setLoadingWidgetData(true);
        setError(null);

        const response = await getWidgetData<ClockDateWidgetData>(widgetId);
        setWidgetData(response);
      } catch (err) {
        console.error(err);
        setError("Failed to load widget data");
      } finally {
        setLoadingWidgetData(false);
      }
    }

    loadWidgetData();

    if (selectedWidget?.type === "clockDate") {
      intervalId = setInterval(() => {
        loadWidgetData();
      }, 1000);
    }

    return () => {
      if (intervalId) {
        clearInterval(intervalId);
      }
    };
  }, [selectedWidgetId, selectedWidget?.type]);

  const content = useMemo(() => {
    if (loadingWidgets) {
      return (
        <DisplayFrame title="Display Mode">
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.message}>Loading widgets...</Text>
          </View>
        </DisplayFrame>
      );
    }

    if (error) {
      return (
        <DisplayFrame title="Display Mode">
          <View style={styles.centered}>
            <Text style={styles.error}>{error}</Text>
          </View>
        </DisplayFrame>
      );
    }

    if (!selectedWidget) {
      return (
        <DisplayFrame title="Display Mode">
          <View style={styles.centered}>
            <Text style={styles.message}>No widgets configured yet.</Text>
          </View>
        </DisplayFrame>
      );
    }

    if (loadingWidgetData && !widgetData) {
      return (
        <DisplayFrame title="Display Mode">
          <View style={styles.centered}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.message}>Loading widget data...</Text>
          </View>
        </DisplayFrame>
      );
    }

    if (selectedWidget.type === "clockDate") {
      return <ClockDateRenderer data={widgetData?.data ?? null} />;
    }

    return (
      <DisplayFrame title="Display Mode">
        <View style={styles.centered}>
          <Text style={styles.message}>
            Unsupported widget type: {selectedWidget.type}
          </Text>
        </View>
      </DisplayFrame>
    );
  }, [loadingWidgets, loadingWidgetData, error, selectedWidget, widgetData]);

  return <View style={styles.screen}>{content}</View>;
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
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
});
