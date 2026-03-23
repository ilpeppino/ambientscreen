import React, { useCallback, useEffect, useMemo, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useEntitlements } from "../../entitlements/entitlements.context";
import { UpgradeModal } from "../../entitlements/UpgradeModal";
import { EmptyPanel } from "../../../shared/ui/management";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { colors } from "../../../shared/ui/theme";
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
} from "../adminHome.logic";
import { AdminTopBar } from "../components/AdminTopBar";
import { DashboardCanvas } from "../components/DashboardCanvas";
import { WidgetSidebar } from "../components/WidgetSidebar";
import { SettingsScreen } from "./SettingsScreen";

interface AdminEditorScreenProps {
  currentDeviceId: string | null;
  onEnterDisplayMode: () => void;
  onEnterRemoteControlMode: () => void;
  onEnterMarketplace: () => void;
  onLogout: () => void;
}

/**
 * Web-first admin editor shell.
 * Renders a canvas-centered layout with a widget sidebar and top bar.
 * Non-editor sections (profiles, devices, navigation) live in SettingsScreen.
 */
export function AdminEditorScreen({
  currentDeviceId,
  onEnterDisplayMode,
  onEnterRemoteControlMode,
  onEnterMarketplace,
  onLogout,
}: AdminEditorScreenProps) {
  const { plan, hasFeature } = useEntitlements();
  const [upgradeModalVisible, setUpgradeModalVisible] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const {
    profiles,
    activeProfileId,
    profilesError,
    activateProfile,
    createProfile,
    renameProfile,
    deleteProfile,
  } = useCloudProfiles();

  // Profile management state
  const [newProfileName, setNewProfileName] = useState("");
  const [renameProfileName, setRenameProfileName] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [renamingProfile, setRenamingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);

  // Widget state
  const [widgets, setWidgets] = useState<WidgetInstance[]>([]);
  const [selectedWidgetType, setSelectedWidgetType] = useState<CreatableWidgetType>(
    CREATABLE_WIDGET_TYPES[0] ?? "clockDate",
  );
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

  // Device management state
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [renameDraftByDeviceId, setRenameDraftByDeviceId] = useState<Record<string, string>>({});
  const [renamingDeviceId, setRenamingDeviceId] = useState<string | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const [confirmDeleteDeviceId, setConfirmDeleteDeviceId] = useState<string | null>(null);

  const loadWidgets = useCallback(
    async (signal?: { cancelled: boolean }) => {
      if (!activeProfileId) {
        setWidgets([]);
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        setError(null);
        const response = await getWidgets(activeProfileId);
        if (signal?.cancelled) return;
        setWidgets(response);
      } catch (err) {
        if (signal?.cancelled) return;
        console.error(err);
        setWidgets([]);
        setError("Failed to load widgets");
      } finally {
        if (!signal?.cancelled) {
          setLoading(false);
        }
      }
    },
    [activeProfileId],
  );

  const loadDevices = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      setLoadingDevices(true);
      setDevicesError(null);
      const response = await getDevices();
      if (signal?.cancelled) return;
      setDevices(response);
      setRenameDraftByDeviceId((current) => {
        const next: Record<string, string> = {};
        response.forEach((device) => {
          next[device.id] = current[device.id] ?? device.name;
        });
        return next;
      });
    } catch (err) {
      if (signal?.cancelled) return;
      console.error(err);
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
    void loadWidgets(signal);
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
          weatherConfig: { location: weatherLocation, units: weatherUnits },
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
      setCreateError(err instanceof Error ? err.message : "Failed to create widget");
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
    if (!activeProfileId) return;

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
    if (!activeProfileId || profiles.length <= 1) return;

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
    } catch (err) {
      console.error(err);
      setDevicesError(err instanceof Error ? err.message : "Failed to rename device");
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
    } catch (err) {
      console.error(err);
      setDevicesError(err instanceof Error ? err.message : "Failed to delete device");
    } finally {
      setDeletingDeviceId(null);
    }
  }

  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  if (loading) {
    return (
      <View style={styles.screen}>
        <EmptyPanel
          variant="loading"
          title="Loading editor"
          message="Fetching widgets and profile data."
        />
      </View>
    );
  }

  if (error) {
    return (
      <View style={styles.screen}>
        <ErrorState message={error} onRetry={() => void loadWidgets()} />
      </View>
    );
  }

  if (isSettingsOpen) {
    return (
      <>
        <SettingsScreen
          onBack={() => setIsSettingsOpen(false)}
          profiles={profiles}
          activeProfileId={activeProfileId}
          profileError={profileError}
          newProfileName={newProfileName}
          setNewProfileName={setNewProfileName}
          renameProfileName={renameProfileName}
          setRenameProfileName={setRenameProfileName}
          creatingProfile={creatingProfile}
          renamingProfile={renamingProfile}
          deletingProfile={deletingProfile}
          confirmDeleteProfile={confirmDeleteProfile}
          setConfirmDeleteProfile={setConfirmDeleteProfile}
          onActivateProfile={(id) => void activateProfile(id)}
          onCreateProfile={() => void handleCreateProfile()}
          onRenameProfile={() => void handleRenameActiveProfile()}
          onDeleteProfile={() => void handleDeleteActiveProfile()}
          devices={devices}
          loadingDevices={loadingDevices}
          devicesError={devicesError}
          currentDeviceId={currentDeviceId}
          renameDraftByDeviceId={renameDraftByDeviceId}
          onChangeDeviceNameDraft={(deviceId, value) =>
            setRenameDraftByDeviceId((current) => ({ ...current, [deviceId]: value }))
          }
          renamingDeviceId={renamingDeviceId}
          deletingDeviceId={deletingDeviceId}
          confirmDeleteDeviceId={confirmDeleteDeviceId}
          setConfirmDeleteDeviceId={setConfirmDeleteDeviceId}
          onRenameDevice={(id) => void handleRenameDevice(id)}
          onDeleteDevice={(id) => void handleDeleteDevice(id)}
          onRetryLoadDevices={() => void loadDevices()}
          onEnterDisplayMode={onEnterDisplayMode}
          onEnterRemoteControlMode={onEnterRemoteControlMode}
          onEnterMarketplace={onEnterMarketplace}
          onLogout={onLogout}
        />
        <UpgradeModal
          visible={upgradeModalVisible}
          onDismiss={() => setUpgradeModalVisible(false)}
        />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <AdminTopBar
        activeProfileName={activeProfile?.name ?? null}
        plan={plan}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onEnterDisplayMode={onEnterDisplayMode}
        onEnterMarketplace={onEnterMarketplace}
      />

      <View style={styles.body}>
        <WidgetSidebar
          plan={plan}
          hasFeature={hasFeature}
          onUpgradePress={() => setUpgradeModalVisible(true)}
          selectedWidgetType={selectedWidgetType}
          onSelectWidgetType={setSelectedWidgetType}
          weatherLocation={weatherLocation}
          setWeatherLocation={setWeatherLocation}
          weatherUnits={weatherUnits}
          setWeatherUnits={setWeatherUnits}
          calendarProvider={calendarProvider}
          setCalendarProvider={setCalendarProvider}
          calendarAccount={calendarAccount}
          setCalendarAccount={setCalendarAccount}
          calendarTimeWindow={calendarTimeWindow}
          setCalendarTimeWindow={setCalendarTimeWindow}
          creatingWidget={creatingWidget}
          createError={createError}
          onCreateWidget={() => void handleCreateWidget()}
          widgets={widgets}
          activeError={activeError}
          settingActiveWidgetId={settingActiveWidgetId}
          onSetActiveWidget={(id) => void handleSetActiveWidget(id)}
          onRetryLoadWidgets={() => void loadWidgets()}
        />

        <DashboardCanvas />
      </View>

      <UpgradeModal
        visible={upgradeModalVisible}
        onDismiss={() => setUpgradeModalVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundScreen,
  },
  body: {
    flex: 1,
    flexDirection: "row",
  },
});
