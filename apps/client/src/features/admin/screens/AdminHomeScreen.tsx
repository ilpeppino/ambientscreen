import React, { useCallback, useEffect, useMemo, useState } from "react";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { useEntitlements } from "../../entitlements/entitlements.context";
import { UpgradeModal } from "../../entitlements/UpgradeModal";
import { ConfirmDialog } from "../../../shared/ui/overlays";
import {
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput as AppTextInput } from "../../../shared/ui/components";
import {
  ActionRow,
  EmptyPanel,
  FilterChips,
  InlineStatusBadge,
  ManagementActionButton,
  ManagementCard,
  SectionHeader,
} from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import {
  createWidget,
  getWidgets,
  setActiveWidget,
  type WidgetInstance,
} from "../../../services/api/widgetsApi";
import {
  deleteDevice,
  getDevices,
  updateDeviceName,
} from "../../../services/api/devicesApi";
import type { Device } from "@ambient/shared-contracts";
import { useCloudProfiles } from "../../profiles/useCloudProfiles";
import { DeviceCard } from "../../devices/DeviceCard";
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
  currentDeviceId: string | null;
  onEnterDisplayMode: () => void;
  onEnterRemoteControlMode: () => void;
  onEnterMarketplace: () => void;
  onLogout: () => void;
}

export function AdminHomeScreen({
  currentDeviceId,
  onEnterDisplayMode,
  onEnterRemoteControlMode,
  onEnterMarketplace,
  onLogout,
}: AdminHomeScreenProps) {
  const { plan, hasFeature } = useEntitlements();
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);

  const {
    profiles,
    activeProfileId,
    profilesError,
    activateProfile,
    createProfile,
    renameProfile,
    deleteProfile,
  } = useCloudProfiles();
  const [newProfileName, setNewProfileName] = useState("");
  const [renameProfileName, setRenameProfileName] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [renamingProfile, setRenamingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [selectedWidgetType, setSelectedWidgetType] =
    useState<CreatableWidgetType>(CREATABLE_WIDGET_TYPES[0] ?? "clockDate");
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
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [renameDraftByDeviceId, setRenameDraftByDeviceId] = useState<Record<string, string>>({});
  const [renamingDeviceId, setRenamingDeviceId] = useState<string | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);
  const [confirmDeleteDeviceId, setConfirmDeleteDeviceId] = useState<string | null>(null);

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

  const loadDevices = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      setLoadingDevices(true);
      setDevicesError(null);
      const response = await getDevices();

      if (signal?.cancelled) {
        return;
      }

      setDevices(response);
      setRenameDraftByDeviceId((current) => {
        const next: Record<string, string> = {};
        response.forEach((device) => {
          next[device.id] = current[device.id] ?? device.name;
        });
        return next;
      });
    } catch (error) {
      if (signal?.cancelled) {
        return;
      }

      console.error(error);
      setDevices([]);
      setDevicesError("Failed to load devices");
    } finally {
      if (!signal?.cancelled) {
        setLoadingDevices(false);
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

  useEffect(() => {
    const signal = { cancelled: false };
    void loadDevices(signal);

    return () => {
      signal.cancelled = true;
    };
  }, [loadDevices]);

  useEffect(() => {
    setProfileError(profilesError);
  }, [profilesError]);

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

  async function handleRenameDevice(deviceId: string) {
    const nextName = (renameDraftByDeviceId[deviceId] ?? "").trim();
    if (!nextName) {
      setDevicesError("Device name cannot be empty");
      return;
    }

    try {
      setRenamingDeviceId(deviceId);
      setDevicesError(null);
      await updateDeviceName(deviceId, { name: nextName });
      await loadDevices();
    } catch (error) {
      console.error(error);
      setDevicesError(error instanceof Error ? error.message : "Failed to rename device");
    } finally {
      setRenamingDeviceId(null);
    }
  }

  async function handleDeleteDevice(deviceId: string) {
    try {
      setDeletingDeviceId(deviceId);
      setDevicesError(null);
      await deleteDevice(deviceId);
      await loadDevices();
    } catch (error) {
      console.error(error);
      setDevicesError(error instanceof Error ? error.message : "Failed to delete device");
    } finally {
      setDeletingDeviceId(null);
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
      await createProfile(trimmedName);
      setNewProfileName("");
    } catch (err) {
      console.error(err);
      setProfileError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setCreatingProfile(false);
    }
  }

  async function handleRenameActiveProfile() {
    if (!activeProfileId) {
      return;
    }

    const trimmedName = renameProfileName.trim();
    if (!trimmedName) {
      setProfileError("Profile name is required");
      return;
    }

    try {
      setRenamingProfile(true);
      setProfileError(null);
      await renameProfile(activeProfileId, trimmedName);
      setRenameProfileName("");
    } catch (err) {
      console.error(err);
      setProfileError(err instanceof Error ? err.message : "Failed to rename profile");
    } finally {
      setRenamingProfile(false);
    }
  }

  async function handleDeleteActiveProfile() {
    if (!activeProfileId || profiles.length <= 1) {
      return;
    }

    try {
      setDeletingProfile(true);
      setProfileError(null);
      await deleteProfile(activeProfileId);
    } catch (err) {
      console.error(err);
      setProfileError(err instanceof Error ? err.message : "Failed to delete profile");
    } finally {
      setDeletingProfile(false);
    }
  }

  const activeWidget = useMemo(() => selectAdminActiveWidget(widgets), [widgets]);

  if (loading) {
    return (
      <View style={styles.screen}>
        <EmptyPanel
          variant="loading"
          title="Loading management workspace"
          message="Fetching widgets and profile data."
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <EmptyPanel
          variant="error"
          title="Unable to load widgets"
          message={error}
          actionLabel="Retry"
          onAction={() => {
            void loadWidgets();
          }}
        />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.content} contentContainerStyle={styles.contentContainer}>
        <SectionHeader
          icon="settings"
          title="Admin Home"
          subtitle={`Active profile: ${profiles.find((profile) => profile.id === activeProfileId)?.name ?? "none"}`}
          rightAction={
            <InlineStatusBadge
              label={plan === "pro" ? "Pro plan" : "Free plan"}
              tone={plan === "pro" ? "premium" : "neutral"}
              icon={plan === "pro" ? "star" : "grid"}
            />
          }
        />

        <ManagementCard
          title="Profile Management"
          subtitle={`Active widget: ${activeWidget ? `${activeWidget.type} (${activeWidget.id})` : "none"}`}
          icon="calendar"
          badges={activeProfileId ? <InlineStatusBadge label="Active profile selected" tone="info" icon="check" /> : null}
        >
          <FilterChips
            items={profiles.map((profile) => ({ key: profile.id, label: profile.name, icon: "calendar" }))}
            activeKey={activeProfileId}
            onChange={(next) => {
              if (next) {
                void activateProfile(next);
              }
            }}
          />

          <View style={styles.inlineFields}>
            <AppTextInput
              accessibilityLabel="New profile name"
              style={[styles.textInput, styles.growInput]}
              value={newProfileName}
              onChangeText={setNewProfileName}
              placeholder="New profile name"
            />
            <ManagementActionButton
              label="Create"
              tone="primary"
              icon="plus"
              loading={creatingProfile}
              onPress={handleCreateProfile}
            />
          </View>

          <View style={styles.inlineFields}>
            <AppTextInput
              accessibilityLabel="Rename active profile"
              style={[styles.textInput, styles.growInput]}
              value={renameProfileName}
              onChangeText={setRenameProfileName}
              placeholder="Rename active profile"
            />
            <ManagementActionButton
              label="Rename"
              tone="secondary"
              loading={renamingProfile}
              onPress={handleRenameActiveProfile}
            />
            <ManagementActionButton
              label="Delete"
              tone="destructive"
              icon="trash"
              disabled={profiles.length <= 1}
              loading={deletingProfile}
              onPress={() => setConfirmDeleteProfile(true)}
            />
          </View>

          {profileError ? <EmptyPanel variant="error" title="Profile error" message={profileError} /> : null}
        </ManagementCard>

        <ManagementCard title="Device Management" subtitle="Rename devices and remove old registrations." icon="grid">
          {loadingDevices ? (
            <EmptyPanel variant="loading" title="Loading devices" message="Fetching registered devices." />
          ) : devices.length === 0 ? (
            <EmptyPanel title="No devices registered" message="Open display mode on a device to register it." />
          ) : (
            <View style={styles.stack}>
              {devices.map((device) => {
                const isCurrentDevice = currentDeviceId === device.id;
                const isRenaming = renamingDeviceId === device.id;
                const isDeleting = deletingDeviceId === device.id;

                return (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    isCurrentDevice={isCurrentDevice}
                  >
                    <View style={styles.inlineFields}>
                      <AppTextInput
                        accessibilityLabel={`Rename device ${device.name}`}
                        style={[styles.textInput, styles.growInput]}
                        value={renameDraftByDeviceId[device.id] ?? ""}
                        onChangeText={(value) => {
                          setRenameDraftByDeviceId((current) => ({
                            ...current,
                            [device.id]: value,
                          }));
                        }}
                        placeholder="Device name"
                      />
                      <ManagementActionButton
                        label="Rename"
                        tone="secondary"
                        loading={isRenaming}
                        onPress={() => {
                          void handleRenameDevice(device.id);
                        }}
                      />
                      <ManagementActionButton
                        label="Delete"
                        tone="destructive"
                        icon="trash"
                        disabled={isCurrentDevice}
                        loading={isDeleting}
                        onPress={() => setConfirmDeleteDeviceId(device.id)}
                      />
                    </View>
                  </DeviceCard>
                );
              })}
            </View>
          )}
          {devicesError ? <EmptyPanel variant="error" title="Device error" message={devicesError} /> : null}
        </ManagementCard>

        <ManagementCard
          title="Widget Library"
          subtitle="Create widgets and define an active widget for the selected profile."
          icon="grid"
          badges={
            plan === "free" ? (
              <ManagementActionButton
                label="Upgrade to Pro"
                tone="secondary"
                icon="star"
                onPress={() => setUpgradeModalVisible(true)}
              />
            ) : (
              <InlineStatusBadge label="Pro unlocked" tone="premium" icon="star" />
            )
          }
        >
          <FilterChips
            items={CREATABLE_WIDGET_TYPES.map((widgetType) => ({
              key: widgetType,
              label: widgetType,
              icon: widgetType === "calendar" ? "calendar" : widgetType === "weather" ? "weather" : "clock",
            }))}
            activeKey={selectedWidgetType}
            onChange={(next) => {
              const isPremium = widgetBuiltinDefinitions[next as CreatableWidgetType]?.manifest?.premium === true;
              if (isPremium && !hasFeature("premium_widgets")) {
                setUpgradeModalVisible(true);
                return;
              }
              setSelectedWidgetType(next as CreatableWidgetType);
            }}
          />

          {selectedWidgetType === "weather" ? (
            <View style={styles.stack}>
              <Text style={styles.fieldLabel}>Location</Text>
              <AppTextInput
                accessibilityLabel="Weather location"
                autoCapitalize="words"
                autoCorrect={false}
                style={styles.textInput}
                value={weatherLocation}
                onChangeText={setWeatherLocation}
                placeholder="City or location"
              />
              <Text style={styles.fieldLabel}>Units</Text>
              <FilterChips
                items={WEATHER_UNITS.map((unit) => ({ key: unit, label: unit, icon: "weather" }))}
                activeKey={weatherUnits}
                onChange={(next) => setWeatherUnits(next as WeatherUnit)}
              />
            </View>
          ) : selectedWidgetType === "calendar" ? (
            <View style={styles.stack}>
              <Text style={styles.fieldLabel}>Provider</Text>
              <FilterChips
                items={CALENDAR_PROVIDERS.map((provider) => ({ key: provider, label: provider, icon: "calendar" }))}
                activeKey={calendarProvider}
                onChange={(next) => setCalendarProvider(next as CalendarProvider)}
              />
              <Text style={styles.fieldLabel}>Account (iCal URL)</Text>
              <AppTextInput
                accessibilityLabel="Calendar account"
                autoCapitalize="none"
                autoCorrect={false}
                style={styles.textInput}
                value={calendarAccount}
                onChangeText={setCalendarAccount}
                placeholder="https://calendar.example.com/feed.ics"
              />
              <Text style={styles.fieldLabel}>Time window</Text>
              <FilterChips
                items={CALENDAR_TIME_WINDOWS.map((window) => ({ key: window, label: window, icon: "calendar" }))}
                activeKey={calendarTimeWindow}
                onChange={(next) => setCalendarTimeWindow(next as CalendarTimeWindow)}
              />
            </View>
          ) : null}

          <ActionRow>
            <ManagementActionButton
              label="Create Widget"
              tone="primary"
              icon="plus"
              loading={creatingWidget}
              onPress={handleCreateWidget}
            />
          </ActionRow>
          {createError ? <EmptyPanel variant="error" title="Create widget failed" message={createError} /> : null}
        </ManagementCard>

        <ManagementCard title="Configured Widgets" subtitle="Set which widget is active in the display." icon="clock">
          {widgets.length === 0 ? (
            <EmptyPanel title="No widgets configured" message="Create a widget to start building your screen." />
          ) : (
            <View style={styles.stack}>
              {widgets.map((widget) => (
                <ManagementCard
                  key={widget.id}
                  title={widget.type}
                  subtitle={`Widget ID: ${widget.id}`}
                  icon={widget.type === "calendar" ? "calendar" : widget.type === "weather" ? "weather" : "clock"}
                  badges={
                    widget.isActive ? (
                      <InlineStatusBadge label="Active" tone="success" icon="check" />
                    ) : (
                      <InlineStatusBadge label="Inactive" tone="neutral" icon="close" />
                    )
                  }
                  footer={
                    <ActionRow>
                      <ManagementActionButton
                        label="Set Active"
                        tone="secondary"
                        disabled={widget.isActive}
                        loading={settingActiveWidgetId === widget.id}
                        onPress={() => {
                          void handleSetActiveWidget(widget.id);
                        }}
                      />
                    </ActionRow>
                  }
                />
              ))}
            </View>
          )}
          {activeError ? <EmptyPanel variant="error" title="Widget activation failed" message={activeError} /> : null}
        </ManagementCard>

        <ManagementCard title="Navigation" subtitle="Switch product modes." icon="chevronRight">
          <ActionRow>
            <ManagementActionButton label="Plugin Marketplace" tone="primary" icon="star" onPress={onEnterMarketplace} />
            <ManagementActionButton label="Display Mode" tone="secondary" icon="grid" onPress={onEnterDisplayMode} />
            <ManagementActionButton label="Remote Control" tone="secondary" icon="refresh" onPress={onEnterRemoteControlMode} />
            <ManagementActionButton label="Logout" tone="destructive" icon="close" onPress={onLogout} />
          </ActionRow>
        </ManagementCard>
      </ScrollView>

      <UpgradeModal visible={upgradeModalVisible} onDismiss={() => setUpgradeModalVisible(false)} />

      <ConfirmDialog
        visible={confirmDeleteProfile}
        title="Delete Profile"
        message="Are you sure you want to delete the active profile?"
        warningText="This cannot be undone. All widgets in this profile will be permanently removed."
        confirmLabel="Delete"
        loading={deletingProfile}
        onConfirm={() => {
          setConfirmDeleteProfile(false);
          void handleDeleteActiveProfile();
        }}
        onCancel={() => setConfirmDeleteProfile(false)}
      />

      <ConfirmDialog
        visible={confirmDeleteDeviceId !== null}
        title="Delete Device"
        message="Are you sure you want to remove this device registration?"
        warningText="This cannot be undone."
        confirmLabel="Delete"
        loading={confirmDeleteDeviceId !== null && deletingDeviceId === confirmDeleteDeviceId}
        onConfirm={() => {
          const id = confirmDeleteDeviceId;
          setConfirmDeleteDeviceId(null);
          if (id) {
            void handleDeleteDevice(id);
          }
        }}
        onCancel={() => setConfirmDeleteDeviceId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundScreen,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.md,
  },
  inlineFields: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    flexWrap: "wrap",
  },
  growInput: {
    flex: 1,
    minWidth: 180,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.label.fontSize,
  },
  stack: {
    gap: 10,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.small.fontSize,
    fontWeight: "600",
  },
});
