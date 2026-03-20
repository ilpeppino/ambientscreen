import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import {
  createWidget,
  getWidgets,
  setActiveWidget,
  type WidgetInstance,
} from "../../../services/api/widgetsApi";
import {
  buildCreateWidgetInput,
  CREATABLE_WIDGET_TYPES,
  type CreatableWidgetType,
  WEATHER_UNITS,
  type WeatherUnit,
  selectAdminActiveWidget,
} from "../adminHome.logic";

interface AdminHomeScreenProps {
  onEnterDisplayMode: () => void;
}

export function AdminHomeScreen({ onEnterDisplayMode }: AdminHomeScreenProps) {
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [selectedWidgetType, setSelectedWidgetType] =
    useState<CreatableWidgetType>(CREATABLE_WIDGET_TYPES[0]);
  const [weatherLocation, setWeatherLocation] = useState("Amsterdam");
  const [weatherUnits, setWeatherUnits] = useState<WeatherUnit>("metric");
  const [loading, setLoading] = useState(true);
  const [creatingWidget, setCreatingWidget] = useState(false);
  const [settingActiveWidgetId, setSettingActiveWidgetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<string | null>(null);

  const loadWidgets = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      setLoading(true);
      setError(null);
      const response = await getWidgets();

      if (signal?.cancelled) {
        return;
      }
      setWidgets(response);
    } catch (err) {
      if (signal?.cancelled) {
        return;
      }
      console.error(err);
      setWidgets([]);
      setError("Failed to load widgets");
    } finally {
      if (!signal?.cancelled) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };

    loadWidgets(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [loadWidgets]);

  async function handleCreateWidget() {
    try {
      setCreatingWidget(true);
      setCreateError(null);
      setActiveError(null);

      await createWidget(
        buildCreateWidgetInput({
          widgetType: selectedWidgetType,
          weatherConfig: {
            location: weatherLocation,
            units: weatherUnits,
          },
        }),
      );
      await loadWidgets();
    } catch (err) {
      console.error(err);
      if (err instanceof Error) {
        setCreateError(err.message);
      } else {
        setCreateError("Failed to create widget");
      }
    } finally {
      setCreatingWidget(false);
    }
  }

  async function handleSetActiveWidget(widgetId: string) {
    try {
      setSettingActiveWidgetId(widgetId);
      setActiveError(null);
      setCreateError(null);

      await setActiveWidget(widgetId);
      await loadWidgets();
    } catch (err) {
      console.error(err);
      setActiveError("Failed to set active widget");
    } finally {
      setSettingActiveWidgetId(null);
    }
  }

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

      <View style={styles.createSection}>
        <Text style={styles.createLabel}>Create widget</Text>
        <View style={styles.typeGrid}>
          {CREATABLE_WIDGET_TYPES.map((widgetType) => {
            const selected = widgetType === selectedWidgetType;

            return (
              <Pressable
                key={widgetType}
                accessibilityRole="button"
                style={[styles.typeButton, selected && styles.typeButtonSelected]}
                onPress={() => setSelectedWidgetType(widgetType)}
              >
                <Text style={[styles.typeButtonLabel, selected && styles.typeButtonLabelSelected]}>
                  {widgetType}
                </Text>
              </Pressable>
            );
          })}
        </View>
        {selectedWidgetType === "weather" ? (
          <View style={styles.weatherConfig}>
            <Text style={styles.weatherConfigLabel}>Location</Text>
            <TextInput
              accessibilityLabel="Weather location"
              autoCapitalize="words"
              autoCorrect={false}
              style={styles.textInput}
              value={weatherLocation}
              onChangeText={setWeatherLocation}
              placeholder="City or location"
              placeholderTextColor="#7f7f7f"
            />
            <Text style={styles.weatherConfigLabel}>Units</Text>
            <View style={styles.unitsRow}>
              {WEATHER_UNITS.map((unit) => {
                const selected = weatherUnits === unit;

                return (
                  <Pressable
                    key={unit}
                    accessibilityRole="button"
                    style={[styles.unitButton, selected && styles.unitButtonSelected]}
                    onPress={() => setWeatherUnits(unit)}
                  >
                    <Text style={[styles.unitButtonLabel, selected && styles.unitButtonLabelSelected]}>
                      {unit}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>
        ) : null}
        <Pressable
          accessibilityRole="button"
          style={[styles.createButton, creatingWidget && styles.createButtonDisabled]}
          disabled={creatingWidget}
          onPress={handleCreateWidget}
        >
          <Text style={styles.createButtonLabel}>
            {creatingWidget ? "Creating..." : "Create Widget"}
          </Text>
        </Pressable>
        {createError ? <Text style={styles.error}>{createError}</Text> : null}
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
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.setActiveButton,
                  widget.isActive && styles.setActiveButtonDisabled,
                  settingActiveWidgetId === widget.id && styles.setActiveButtonDisabled,
                ]}
                disabled={widget.isActive || settingActiveWidgetId === widget.id}
                onPress={() => handleSetActiveWidget(widget.id)}
              >
                <Text style={styles.setActiveButtonLabel}>
                  {settingActiveWidgetId === widget.id ? "Setting..." : "Set Active"}
                </Text>
              </Pressable>
            </View>
          ))
        )}
      </ScrollView>
      {activeError ? <Text style={styles.error}>{activeError}</Text> : null}

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
  createSection: {
    paddingHorizontal: 24,
    paddingBottom: 16,
    gap: 10,
  },
  createLabel: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  typeGrid: {
    flexDirection: "row",
    gap: 8,
  },
  typeButton: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 10,
    backgroundColor: "#111",
  },
  typeButtonSelected: {
    borderColor: "#fff",
    backgroundColor: "#1e1e1e",
  },
  typeButtonLabel: {
    color: "#d1d1d1",
    fontSize: 13,
    fontWeight: "600",
  },
  typeButtonLabelSelected: {
    color: "#fff",
  },
  createButton: {
    backgroundColor: "#2d8cff",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  createButtonDisabled: {
    opacity: 0.6,
  },
  weatherConfig: {
    gap: 8,
  },
  weatherConfigLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderColor: "#555",
    backgroundColor: "#111",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
  },
  unitsRow: {
    flexDirection: "row",
    gap: 8,
  },
  unitButton: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: "#111",
  },
  unitButtonSelected: {
    borderColor: "#fff",
    backgroundColor: "#1e1e1e",
  },
  unitButtonLabel: {
    color: "#d1d1d1",
    fontSize: 13,
    fontWeight: "600",
  },
  unitButtonLabelSelected: {
    color: "#fff",
  },
  createButtonLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
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
  setActiveButton: {
    marginTop: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "#555",
    paddingVertical: 10,
    alignItems: "center",
    backgroundColor: "#1a1a1a",
  },
  setActiveButtonDisabled: {
    opacity: 0.6,
  },
  setActiveButtonLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
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
