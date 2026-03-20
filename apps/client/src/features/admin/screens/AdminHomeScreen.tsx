import React, { useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import {
  getWidgets,
  type WidgetInstance,
} from "../../../services/api/widgetsApi";
import { selectAdminActiveWidget } from "../adminHome.logic";

interface AdminHomeScreenProps {
  onEnterDisplayMode: () => void;
}

export function AdminHomeScreen({ onEnterDisplayMode }: AdminHomeScreenProps) {
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;

    async function loadWidgets() {
      try {
        setLoading(true);
        setError(null);
        const response = await getWidgets();
        if (cancelled) {
          return;
        }
        setWidgets(response);
      } catch (err) {
        if (cancelled) {
          return;
        }
        console.error(err);
        setWidgets([]);
        setError("Failed to load widgets");
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    loadWidgets();

    return () => {
      cancelled = true;
    };
  }, []);

  const activeWidget = useMemo(() => selectAdminActiveWidget(widgets), [widgets]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <ActivityIndicator size="large" color="#fff" />
        <Text style={styles.message}>Loading widgets...</Text>
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <Text style={styles.error}>{error}</Text>
      </View>
    );
  }

  return (
    <View style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Admin Home</Text>
        <Text style={styles.subtitle}>
          Active widget: {activeWidget ? `${activeWidget.type} (${activeWidget.id})` : "none"}
        </Text>
      </View>

      <ScrollView style={styles.list} contentContainerStyle={styles.listContent}>
        {widgets.length === 0 ? (
          <Text style={styles.message}>No widgets configured yet.</Text>
        ) : (
          widgets.map((widget) => (
            <View key={widget.id} style={styles.widgetCard}>
              <Text style={styles.widgetType}>{widget.type}</Text>
              <Text style={styles.widgetMeta}>Widget ID: {widget.id}</Text>
              <Text style={styles.widgetMeta}>
                Status: {widget.isActive ? "active" : "inactive"}
              </Text>
            </View>
          ))
        )}
      </ScrollView>

      <View style={styles.footer}>
        <Pressable
          accessibilityRole="button"
          style={styles.displayButton}
          onPress={onEnterDisplayMode}
        >
          <Text style={styles.displayButtonLabel}>Enter Display Mode</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#000",
    paddingTop: 24,
  },
  header: {
    paddingHorizontal: 24,
    paddingBottom: 12,
  },
  title: {
    color: "#fff",
    fontSize: 28,
    fontWeight: "700",
  },
  subtitle: {
    marginTop: 6,
    color: "#aaa",
    fontSize: 14,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    gap: 12,
  },
  widgetCard: {
    borderWidth: 1,
    borderColor: "#2d2d2d",
    borderRadius: 10,
    padding: 14,
    backgroundColor: "#111",
  },
  widgetType: {
    color: "#fff",
    fontSize: 18,
    fontWeight: "600",
  },
  widgetMeta: {
    marginTop: 4,
    color: "#bbb",
    fontSize: 13,
  },
  message: {
    color: "#fff",
    fontSize: 16,
    textAlign: "center",
    marginTop: 10,
    paddingHorizontal: 24,
  },
  error: {
    color: "#ff6b6b",
    fontSize: 16,
    textAlign: "center",
    paddingHorizontal: 24,
  },
  footer: {
    paddingHorizontal: 24,
    paddingBottom: 24,
    paddingTop: 8,
  },
  displayButton: {
    backgroundColor: "#fff",
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: "center",
  },
  displayButtonLabel: {
    color: "#000",
    fontWeight: "700",
    fontSize: 16,
  },
});
