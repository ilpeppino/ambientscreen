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
import type { Profile } from "@ambient/shared-contracts";
import { resolveActiveProfileId } from "../../profiles/profiles.logic";
import {
  loadPersistedActiveProfileId,
  persistActiveProfileId,
} from "../../profiles/profileStorage";
import {
  createProfile as createProfileApi,
  deleteProfile as deleteProfileApi,
  getProfiles as getProfilesApi,
} from "../../../services/api/profilesApi";
import {
  buildCreateWidgetInput,
  CALENDAR_PROVIDERS,
  CALENDAR_TIME_WINDOWS,
  type CalendarProvider,
  type CalendarTimeWindow,
  CREATABLE_WIDGET_TYPES,
  type CreatableWidgetType,
  WEATHER_UNITS,
  type WeatherUnit,
  selectAdminActiveWidget,
} from "../adminHome.logic";

interface AdminHomeScreenProps {
  onEnterDisplayMode: () => void;
  onLogout: () => void;
}

export function AdminHomeScreen({ onEnterDisplayMode, onLogout }: AdminHomeScreenProps) {
  const [profiles, setProfiles] = useState<Profile[]>([]);
  const [activeProfileId, setActiveProfileId] = useState<string | null>(null);
  const [newProfileName, setNewProfileName] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [selectedWidgetType, setSelectedWidgetType] =
    useState<CreatableWidgetType>(CREATABLE_WIDGET_TYPES[0]);
  const [weatherLocation, setWeatherLocation] = useState("Amsterdam");
  const [weatherUnits, setWeatherUnits] = useState<WeatherUnit>("metric");
  const [calendarProvider, setCalendarProvider] = useState<CalendarProvider>("ical");
  const [calendarAccount, setCalendarAccount] = useState("");
  const [calendarTimeWindow, setCalendarTimeWindow] = useState<CalendarTimeWindow>("next7d");
  const [loading, setLoading] = useState(true);
  const [creatingWidget, setCreatingWidget] = useState(false);
  const [settingActiveWidgetId, setSettingActiveWidgetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [createError, setCreateError] = useState<string | null>(null);
  const [activeError, setActiveError] = useState<string | null>(null);

  const loadProfiles = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      setProfileError(null);
      const [responseProfiles, persistedProfileId] = await Promise.all([
        getProfilesApi(),
        loadPersistedActiveProfileId(),
      ]);

      if (signal?.cancelled) {
        return;
      }

      setProfiles(responseProfiles);
      const nextActiveProfileId = resolveActiveProfileId(responseProfiles, persistedProfileId);
      setActiveProfileId(nextActiveProfileId);
      if (nextActiveProfileId) {
        await persistActiveProfileId(nextActiveProfileId);
      }
    } catch (err) {
      if (signal?.cancelled) {
        return;
      }

      console.error(err);
      setProfiles([]);
      setActiveProfileId(null);
      setProfileError("Failed to load profiles");
    }
  }, []);

  const loadWidgets = useCallback(async (signal?: { cancelled: boolean }) => {
    if (!activeProfileId) {
      setWidgets([]);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await getWidgets(activeProfileId);

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
  }, [activeProfileId]);

  useEffect(() => {
    const signal = { cancelled: false };

    loadProfiles(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [loadProfiles]);

  useEffect(() => {
    const signal = { cancelled: false };
    loadWidgets(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [loadWidgets]);

  async function handleCreateWidget() {
    if (!activeProfileId) {
      setCreateError("No active profile selected");
      return;
    }

    try {
      setCreatingWidget(true);
      setCreateError(null);
      setActiveError(null);

      await createWidget(
        buildCreateWidgetInput({
          profileId: activeProfileId ?? undefined,
          widgetType: selectedWidgetType,
          weatherConfig: {
            location: weatherLocation,
            units: weatherUnits,
          },
          calendarConfig: {
            provider: calendarProvider,
            account: calendarAccount || undefined,
            timeWindow: calendarTimeWindow,
          },
        }),
        activeProfileId ?? undefined,
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
    if (!activeProfileId) {
      setActiveError("No active profile selected");
      return;
    }

    try {
      setSettingActiveWidgetId(widgetId);
      setActiveError(null);
      setCreateError(null);

      await setActiveWidget(widgetId, activeProfileId ?? undefined);
      await loadWidgets();
    } catch (err) {
      console.error(err);
      setActiveError("Failed to set active widget");
    } finally {
      setSettingActiveWidgetId(null);
    }
  }

  async function handleCreateProfile() {
    const trimmedName = newProfileName.trim();
    if (!trimmedName) {
      setProfileError("Profile name is required");
      return;
    }

    try {
      setCreatingProfile(true);
      setProfileError(null);
      const profile = await createProfileApi(trimmedName);
      const nextProfiles = [...profiles, profile];
      setProfiles(nextProfiles);
      setNewProfileName("");
      setActiveProfileId(profile.id);
      await persistActiveProfileId(profile.id);
    } catch (err) {
      console.error(err);
      setProfileError("Failed to create profile");
    } finally {
      setCreatingProfile(false);
    }
  }

  async function handleDeleteActiveProfile() {
    if (!activeProfileId || profiles.length <= 1) {
      return;
    }

    try {
      setDeletingProfile(true);
      setProfileError(null);
      await deleteProfileApi(activeProfileId);
      const refreshedProfiles = await getProfilesApi();
      const nextActiveProfileId = resolveActiveProfileId(refreshedProfiles, null);
      setProfiles(refreshedProfiles);
      setActiveProfileId(nextActiveProfileId);
      if (nextActiveProfileId) {
        await persistActiveProfileId(nextActiveProfileId);
      }
    } catch (err) {
      console.error(err);
      setProfileError("Failed to delete profile");
    } finally {
      setDeletingProfile(false);
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
          Active profile: {profiles.find((profile) => profile.id === activeProfileId)?.name ?? "none"}
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.profileTabs}>
          {profiles.map((profile) => {
            const selected = profile.id === activeProfileId;
            return (
              <Pressable
                key={profile.id}
                accessibilityRole="button"
                style={[styles.profileTab, selected && styles.profileTabSelected]}
                onPress={async () => {
                  setActiveProfileId(profile.id);
                  await persistActiveProfileId(profile.id);
                }}
              >
                <Text style={[styles.profileTabLabel, selected && styles.profileTabLabelSelected]}>
                  {profile.name}
                </Text>
              </Pressable>
            );
          })}
        </ScrollView>
        <View style={styles.profileActions}>
          <TextInput
            accessibilityLabel="New profile name"
            style={[styles.textInput, styles.profileInput]}
            value={newProfileName}
            onChangeText={setNewProfileName}
            placeholder="New profile name"
            placeholderTextColor="#7f7f7f"
          />
          <Pressable
            accessibilityRole="button"
            style={[styles.profileActionButton, creatingProfile && styles.createButtonDisabled]}
            onPress={handleCreateProfile}
            disabled={creatingProfile}
          >
            <Text style={styles.profileActionButtonLabel}>
              {creatingProfile ? "Creating..." : "New Profile"}
            </Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.profileDeleteButton,
              (profiles.length <= 1 || deletingProfile) && styles.createButtonDisabled,
            ]}
            onPress={handleDeleteActiveProfile}
            disabled={profiles.length <= 1 || deletingProfile}
          >
            <Text style={styles.profileDeleteButtonLabel}>
              {deletingProfile ? "Deleting..." : "Delete Profile"}
            </Text>
          </Pressable>
        </View>
        <Text style={styles.subtitle}>
          Active widget: {activeWidget ? `${activeWidget.type} (${activeWidget.id})` : "none"}
        </Text>
        {profileError ? <Text style={styles.error}>{profileError}</Text> : null}
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
        ) : selectedWidgetType === "calendar" ? (
          <View style={styles.calendarConfig}>
            <Text style={styles.weatherConfigLabel}>Provider</Text>
            <View style={styles.unitsRow}>
              {CALENDAR_PROVIDERS.map((provider) => {
                const selected = calendarProvider === provider;

                return (
                  <Pressable
                    key={provider}
                    accessibilityRole="button"
                    style={[styles.unitButton, selected && styles.unitButtonSelected]}
                    onPress={() => setCalendarProvider(provider)}
                  >
                    <Text style={[styles.unitButtonLabel, selected && styles.unitButtonLabelSelected]}>
                      {provider}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.weatherConfigLabel}>Account (iCal URL)</Text>
            <TextInput
              accessibilityLabel="Calendar account"
              autoCapitalize="none"
              autoCorrect={false}
              style={styles.textInput}
              value={calendarAccount}
              onChangeText={setCalendarAccount}
              placeholder="https://calendar.example.com/feed.ics"
              placeholderTextColor="#7f7f7f"
            />
            <Text style={styles.weatherConfigLabel}>Time window</Text>
            <View style={styles.unitsRow}>
              {CALENDAR_TIME_WINDOWS.map((window) => {
                const selected = calendarTimeWindow === window;

                return (
                  <Pressable
                    key={window}
                    accessibilityRole="button"
                    style={[styles.unitButton, selected && styles.unitButtonSelected]}
                    onPress={() => setCalendarTimeWindow(window)}
                  >
                    <Text style={[styles.unitButtonLabel, selected && styles.unitButtonLabelSelected]}>
                      {window}
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
        <Pressable
          accessibilityRole="button"
          style={styles.logoutButton}
          onPress={onLogout}
        >
          <Text style={styles.logoutButtonLabel}>Logout</Text>
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
  profileTabs: {
    marginTop: 8,
    marginBottom: 8,
  },
  profileTab: {
    borderWidth: 1,
    borderColor: "#555",
    borderRadius: 999,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: "#111",
    marginRight: 8,
  },
  profileTabSelected: {
    borderColor: "#fff",
    backgroundColor: "#1e1e1e",
  },
  profileTabLabel: {
    color: "#d1d1d1",
    fontSize: 12,
    fontWeight: "600",
  },
  profileTabLabelSelected: {
    color: "#fff",
  },
  profileActions: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
    alignItems: "center",
  },
  profileInput: {
    flex: 1,
  },
  profileActionButton: {
    backgroundColor: "#2d8cff",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  profileActionButtonLabel: {
    color: "#fff",
    fontSize: 12,
    fontWeight: "700",
  },
  profileDeleteButton: {
    backgroundColor: "#3d1b1b",
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  profileDeleteButtonLabel: {
    color: "#ffd4d4",
    fontSize: 12,
    fontWeight: "700",
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
  calendarConfig: {
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
    gap: 10,
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
  logoutButton: {
    backgroundColor: "#2d2d2d",
    borderRadius: 8,
    paddingVertical: 12,
    alignItems: "center",
  },
  logoutButtonLabel: {
    color: "#fff",
    fontWeight: "700",
    fontSize: 14,
  },
});
