import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, View } from "react-native";
import { useEntitlements } from "../../entitlements/entitlements.context";
import { UpgradeModal } from "../../entitlements/UpgradeModal";
import { EmptyPanel } from "../../../shared/ui/management";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { colors } from "../../../shared/ui/theme";
import {
  createWidget,
} from "../../../services/api/widgetsApi";
import { updateWidgetConfig } from "../../../services/api/displayLayoutApi";
import {
  deleteDevice,
  getDevices,
  updateDeviceName,
} from "../../../services/api/devicesApi";
import type { Device } from "@ambient/shared-contracts";
import { useCloudProfiles } from "../../profiles/useCloudProfiles";
import { useDisplayData } from "../../display/hooks/useDisplayData";
import { useEditModeOps } from "../../display/hooks/useEditMode";
import { useRealtimeDisplaySync } from "../../display/hooks/useRealtimeDisplaySync";
import { registerBuiltinWidgetPlugins } from "../../../widgets/registerBuiltinPlugins";
import { API_BASE_URL } from "../../../core/config/api";
import {
  buildCreateWidgetInput,
  type CalendarProvider,
  type CalendarTimeWindow,
  CREATABLE_WIDGET_TYPES,
  type CreatableWidgetType,
  type WeatherUnit,
} from "../adminHome.logic";
import { resolveClickAddLayout } from "../widgetPlacement.logic";
import { AdminTopBar } from "../components/AdminTopBar";
import { DashboardCanvas } from "../components/DashboardCanvas";
import { WidgetSidebar } from "../components/WidgetSidebar";
import { SettingsScreen } from "./SettingsScreen";

// Register widget renderers once for the canvas
registerBuiltinWidgetPlugins();

interface AdminEditorScreenProps {
  currentDeviceId: string | null;
  onEnterDisplayMode: () => void;
  onEnterRemoteControlMode: () => void;
  onEnterMarketplace: () => void;
  onLogout: () => void;
}

/**
 * Web-first admin editor — Phase 2.
 * Canvas-centered layout with live LayoutGrid, widget library sidebar,
 * and a properties inspector that updates on widget selection.
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

  // Profile management
  const {
    profiles,
    activeProfileId,
    profilesError,
    activateProfile,
    createProfile,
    renameProfile,
    deleteProfile,
  } = useCloudProfiles();

  // Profile management UI state
  const [newProfileName, setNewProfileName] = useState("");
  const [renameProfileName, setRenameProfileName] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [renamingProfile, setRenamingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);

  // Device management state
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [renameDraftByDeviceId, setRenameDraftByDeviceId] = useState<Record<string, string>>({});
  const [renamingDeviceId, setRenamingDeviceId] = useState<string | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const [confirmDeleteDeviceId, setConfirmDeleteDeviceId] = useState<string | null>(null);

  const [addingWidgetType, setAddingWidgetType] = useState<CreatableWidgetType | null>(null);
  const [widgetPlacementError, setWidgetPlacementError] = useState<string | null>(null);

  // ---- Canvas data ----
  // Realtime sync keeps canvas fresh without blocking edit mode
  const realtimeConnectionState = useRealtimeDisplaySync({
    apiBaseUrl: API_BASE_URL,
    activeProfileId,
    enabled: true,
    onRefreshRequested: () => {
      void displayData.loadDisplayLayout(false);
    },
  });

  // editMode tracks whether we are in canvas editing state (always true in the editor)
  const [editMode, setEditMode] = useState(false);

  const displayData = useDisplayData({
    effectiveActiveProfileId: activeProfileId,
    editMode: false, // pass false so polling continues in the editor
    isAppActive: true,
    realtimeConnectionState,
  });

  const { widgets: layoutWidgetsSource, loadingLayout, error: layoutLoadError, loadDisplayLayout, saveWidgetLayouts } = displayData;

  const editOps = useEditModeOps({
    editMode,
    setEditMode,
    widgets: layoutWidgetsSource,
    effectiveActiveProfileId: activeProfileId,
    saveWidgetLayouts,
    onAfterSave: async () => {
      await loadDisplayLayout(false);
    },
  });

  const {
    selectedWidgetId,
    setSelectedWidgetId,
    hasLayoutChanges,
    layoutWidgets,
    layoutError,
    savingLayout,
    handleWidgetLayoutChange,
    handleCancelLayout,
    handleSaveLayout,
    handleToggleEditMode,
  } = editOps;

  // Keep canvas always in edit mode
  const handleToggleEditModeRef = useRef(handleToggleEditMode);
  handleToggleEditModeRef.current = handleToggleEditMode;
  useEffect(() => {
    if (!editMode) {
      handleToggleEditModeRef.current();
    }
  }, [editMode]);

  // Sync profile error
  useEffect(() => {
    setProfileError(profilesError);
  }, [profilesError]);

  // ---- Devices ----
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
      if (!signal?.cancelled) setLoadingDevices(false);
    }
  }, []);

  useEffect(() => {
    const signal = { cancelled: false };
    void loadDevices(signal);
    return () => { signal.cancelled = true; };
  }, [loadDevices]);

  // ---- Widget actions ----
  /**
   * Create a new widget and place it on the canvas.
   * When `layout` is provided (drag-and-drop), the widget is created at that exact position.
   * When omitted (click-to-add), the server assigns the next available slot.
   * In both cases the new widget is auto-selected in the properties panel.
   */
  async function handleAddWidgetToCanvas(
    widgetType: CreatableWidgetType,
    layout?: import("../../display/components/LayoutGrid.logic").WidgetLayout,
  ) {
    if (!activeProfileId) return;
    try {
      setAddingWidgetType(widgetType);
      setWidgetPlacementError(null);
      const resolvedLayout = layout ?? resolveClickAddLayout(layoutWidgets, widgetType);
      const payload = {
        ...buildCreateWidgetInput({
          profileId: activeProfileId,
          widgetType,
          weatherConfig: { location: "Amsterdam", units: "metric" },
          calendarConfig: { provider: "ical", timeWindow: "next7d" },
        }),
        layout: resolvedLayout,
      };
      const newWidget = await createWidget(payload, activeProfileId);
      // Reload layout so the new widget appears on canvas
      await loadDisplayLayout(false);
      // Auto-select the newly created widget in the properties panel
      setSelectedWidgetId(newWidget.id);
    } catch (err) {
      console.error("Failed to add widget:", err);
      setWidgetPlacementError(
        err instanceof Error
          ? err.message
          : "Failed to add widget. Please try again.",
      );
    } finally {
      setAddingWidgetType(null);
    }
  }

  async function handleSaveWidgetConfig(widgetId: string, config: Record<string, unknown>) {
    if (!activeProfileId) return;
    await updateWidgetConfig(widgetId, { config }, activeProfileId);
    await loadDisplayLayout(false);
  }

  // ---- Profile actions ----
  async function handleCreateProfile() {
    const trimmedName = newProfileName.trim();
    if (!trimmedName) { setProfileError("Profile name is required"); return; }
    try {
      setCreatingProfile(true);
      setProfileError(null);
      await createProfile(trimmedName);
      setNewProfileName("");
    } catch (err) {
      setProfileError(err instanceof Error ? err.message : "Failed to create profile");
    } finally {
      setCreatingProfile(false);
    }
  }

  async function handleRenameActiveProfile() {
    if (!activeProfileId) return;
    const trimmedName = renameProfileName.trim();
    if (!trimmedName) { setProfileError("Profile name is required"); return; }
    try {
      setRenamingProfile(true);
      setProfileError(null);
      await renameProfile(activeProfileId, trimmedName);
      setRenameProfileName("");
    } catch (err) {
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
      setProfileError(err instanceof Error ? err.message : "Failed to delete profile");
    } finally {
      setDeletingProfile(false);
    }
  }

  // ---- Device actions ----
  async function handleRenameDevice(deviceId: string) {
    const nextName = (renameDraftByDeviceId[deviceId] ?? "").trim();
    if (!nextName) { setDevicesError("Device name cannot be empty"); return; }
    try {
      setRenamingDeviceId(deviceId);
      setDevicesError(null);
      await updateDeviceName(deviceId, { name: nextName });
      await loadDevices();
    } catch (err) {
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
      setDevicesError(err instanceof Error ? err.message : "Failed to delete device");
    } finally {
      setDeletingDeviceId(null);
    }
  }

  // ---- Derived state ----
  const activeProfile = useMemo(
    () => profiles.find((p) => p.id === activeProfileId) ?? null,
    [profiles, activeProfileId],
  );

  const selectedWidget = useMemo(
    () => layoutWidgets.find((w) => w.widgetInstanceId === selectedWidgetId) ?? null,
    [layoutWidgets, selectedWidgetId],
  );

  // ---- Render ----
  if (loadingLayout && layoutWidgets.length === 0 && !editMode) {
    return (
      <View style={styles.screen}>
        <EmptyPanel
          variant="loading"
          title="Loading editor"
          message="Fetching your dashboard layout."
        />
      </View>
    );
  }

  if (layoutLoadError && layoutWidgets.length === 0) {
    return (
      <View style={styles.screen}>
        <ErrorState message={layoutLoadError} onRetry={() => void loadDisplayLayout(true)} />
      </View>
    );
  }

  if (isSettingsOpen) {
    return (
      <>
        <SettingsScreen
          onBack={() => setIsSettingsOpen(false)}
          plan={plan}
          onUpgradePress={() => setUpgradeModalVisible(true)}
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
        <UpgradeModal visible={upgradeModalVisible} onDismiss={() => setUpgradeModalVisible(false)} />
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
          addingWidgetType={addingWidgetType}
          onAddWidget={(type) => void handleAddWidgetToCanvas(type)}
          selectedWidget={selectedWidget}
          onSaveConfig={(id, config) => handleSaveWidgetConfig(id, config)}
        />

        <DashboardCanvas
          widgets={layoutWidgets}
          selectedWidgetId={selectedWidgetId}
          onSelectWidget={setSelectedWidgetId}
          onClearSelection={() => setSelectedWidgetId(null)}
          onWidgetLayoutChange={handleWidgetLayoutChange}
          loadingLayout={loadingLayout}
          error={layoutLoadError}
          onRetry={() => void loadDisplayLayout(true)}
          hasLayoutChanges={hasLayoutChanges}
          savingLayout={savingLayout}
          layoutError={layoutError}
          onSaveLayout={() => void handleSaveLayout()}
          onCancelLayout={() => handleCancelLayout()}
          widgetPlacementError={widgetPlacementError}
          onWidgetDropped={(widgetType, layout) =>
            void handleAddWidgetToCanvas(widgetType, layout)
          }
        />
      </View>

      <UpgradeModal visible={upgradeModalVisible} onDismiss={() => setUpgradeModalVisible(false)} />
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
