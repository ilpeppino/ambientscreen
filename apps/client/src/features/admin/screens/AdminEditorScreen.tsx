import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, TextInput, View } from "react-native";
import { useEntitlements } from "../../entitlements/entitlements.context";
import { UpgradeModal } from "../../entitlements/UpgradeModal";
import { EmptyPanel } from "../../../shared/ui/management";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { ConfirmDialog, DialogModal } from "../../../shared/ui/overlays";
import { colors, spacing, typography } from "../../../shared/ui/theme";
import {
  createWidget,
  deleteWidget,
} from "../../../services/api/widgetsApi";
import { updateWidgetConfig } from "../../../services/api/displayLayoutApi";
import { clearProfileWidgets } from "../../../services/api/profilesApi";
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
  type CreatableWidgetType,
  type WeatherUnit,
} from "../adminHome.logic";
import { AdminTopBar } from "../components/AdminTopBar";
import { DashboardCanvas } from "../components/DashboardCanvas";
import { WidgetSidebar } from "../components/WidgetSidebar";
import { WidgetDragPreviewOverlay } from "../components/WidgetDragPreviewOverlay";
import { SettingsScreen } from "./SettingsScreen";
import { SlideRail } from "../components/SlideRail";
import { useSlideManager } from "../hooks/useSlideManager";

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
    updateProfile,
    deleteProfile,
  } = useCloudProfiles();

  // Profile management UI state
  const [newProfileName, setNewProfileName] = useState("");
  const [renameProfileName, setRenameProfileName] = useState("");
  const [profileError, setProfileError] = useState<string | null>(null);
  const [creatingProfile, setCreatingProfile] = useState(false);
  const [renamingProfile, setRenamingProfile] = useState(false);
  const [deletingProfile, setDeletingProfile] = useState(false);
  const [slideDurationInput, setSlideDurationInput] = useState("30");
  const [slideDurationError, setSlideDurationError] = useState<string | null>(null);
  const [savingSlideDuration, setSavingSlideDuration] = useState(false);
  const [confirmDeleteProfile, setConfirmDeleteProfile] = useState(false);

  // Device management state
  const [devices, setDevices] = useState<Device[]>([]);
  const [loadingDevices, setLoadingDevices] = useState(true);
  const [devicesError, setDevicesError] = useState<string | null>(null);
  const [renameDraftByDeviceId, setRenameDraftByDeviceId] = useState<Record<string, string>>({});
  const [renamingDeviceId, setRenamingDeviceId] = useState<string | null>(null);
  const [deletingDeviceId, setDeletingDeviceId] = useState<string | null>(null);
  const [confirmDeleteDeviceId, setConfirmDeleteDeviceId] = useState<string | null>(null);

  const [selectedLibraryWidgetType, setSelectedLibraryWidgetType] = useState<CreatableWidgetType | null>(null);
  const [inspectorMode, setInspectorMode] = useState<"canvas" | "library" | null>(null);
  const [widgetPlacementError, setWidgetPlacementError] = useState<string | null>(null);
  const [confirmClearCanvas, setConfirmClearCanvas] = useState(false);
  const [clearingCanvas, setClearingCanvas] = useState(false);
  const [createProfileModalVisible, setCreateProfileModalVisible] = useState(false);

  // ---- Slide management ----
  const slideManager = useSlideManager(activeProfileId);
  const {
    slides,
    activeSlideId,
    handleCreateSlide,
    handleRenameSlide,
    handleDeleteSlide,
    selectSlide,
  } = slideManager;

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
    // Scope the canvas to the currently selected slide. When activeSlideId is
    // null (slides still loading) the hook falls back to the first enabled slide.
    slideId: activeSlideId,
    editMode: false, // pass false so polling continues in the editor
    isAppActive: true,
    realtimeConnectionState,
  });

  const {
    activeSlide,
    widgets: layoutWidgetsSource,
    loadingLayout,
    error: layoutLoadError,
    loadDisplayLayout,
    saveWidgetLayouts,
  } = displayData;

  const editOps = useEditModeOps({
    editMode,
    setEditMode,
    widgets: activeSlide?.widgets ?? layoutWidgetsSource,
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

  // Switching slides resets the inspector so stale widget state is cleared.
  const handleSelectSlide = (slideId: string) => {
    selectSlide(slideId);
    setSelectedWidgetId(null);
    setInspectorMode(selectedLibraryWidgetType ? "library" : null);
  };

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
   * Create a new widget from a library drag-drop operation.
   * The widget is persisted through the backend and auto-selected on success.
   */
  async function handlePlaceWidgetFromLibrary(
    widgetType: CreatableWidgetType,
    layout: import("../../display/components/LayoutGrid.logic").WidgetLayout,
  ) {
    if (!activeProfileId) return;
    try {
      setWidgetPlacementError(null);
      const payload = {
        ...buildCreateWidgetInput({
          profileId: activeProfileId,
          widgetType,
          weatherConfig: { city: "Amsterdam", units: "metric" },
          calendarConfig: { provider: "ical", timeWindow: "next7d" },
        }),
        layout,
      };
      const newWidget = await createWidget(
        { ...payload, slideId: activeSlideId ?? undefined },
        activeProfileId,
      );
      // Reload layout so the new widget appears on canvas
      await loadDisplayLayout(false);
      // Auto-select the newly created widget in the properties panel
      setSelectedWidgetId(newWidget.id);
      setInspectorMode("canvas");
    } catch (err) {
      console.error("Failed to add widget:", err);
      setWidgetPlacementError(
        err instanceof Error
          ? err.message
          : "Failed to add widget. Please try again.",
      );
    }
  }

  async function handleSaveWidgetConfig(widgetId: string, config: Record<string, unknown>) {
    if (!activeProfileId) return;
    await updateWidgetConfig(widgetId, { config }, activeProfileId);
    await loadDisplayLayout(false);
  }

  async function handleRemoveWidgetFromCanvas(widgetId: string) {
    if (!activeProfileId) return;
    try {
      setWidgetPlacementError(null);
      await deleteWidget(widgetId, activeProfileId);
      setSelectedWidgetId((current) => (current === widgetId ? null : current));
      setInspectorMode((current) => {
        if (current !== "canvas") return current;
        return selectedLibraryWidgetType ? "library" : null;
      });
      await loadDisplayLayout(false);
    } catch (err) {
      console.error("Failed to delete widget:", err);
      setWidgetPlacementError(
        err instanceof Error
          ? err.message
          : "Failed to delete widget. Please try again.",
      );
    }
  }

  async function handleClearCanvas() {
    if (!activeProfileId) return;
    try {
      setClearingCanvas(true);
      setWidgetPlacementError(null);
      await clearProfileWidgets(activeProfileId);
      await loadDisplayLayout(false);
      setSelectedWidgetId(null);
      setInspectorMode(selectedLibraryWidgetType ? "library" : null);
    } catch (err) {
      console.error("Failed to clear canvas:", err);
      setWidgetPlacementError(
        err instanceof Error
          ? err.message
          : "Failed to clear canvas. Please try again.",
      );
    } finally {
      setClearingCanvas(false);
    }
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

  async function handleSaveSlideDuration() {
    if (!activeProfileId) return;
    const parsed = Number(slideDurationInput);
    if (!Number.isInteger(parsed)) {
      setSlideDurationError("Slide duration must be a whole number.");
      return;
    }
    if (parsed < 3 || parsed > 120) {
      setSlideDurationError("Slide duration must be between 3 and 120 seconds.");
      return;
    }

    try {
      setSavingSlideDuration(true);
      setSlideDurationError(null);
      await updateProfile(activeProfileId, { defaultSlideDurationSeconds: parsed });
    } catch (err) {
      setSlideDurationError(err instanceof Error ? err.message : "Failed to update slide duration");
    } finally {
      setSavingSlideDuration(false);
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

  useEffect(() => {
    if (!activeProfile) {
      setSlideDurationInput("30");
      setSlideDurationError(null);
      return;
    }

    setSlideDurationInput(String(activeProfile.defaultSlideDurationSeconds));
    setSlideDurationError(null);
  }, [activeProfile]);

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
          slideDurationInput={slideDurationInput}
          setSlideDurationInput={setSlideDurationInput}
          slideDurationError={slideDurationError}
          savingSlideDuration={savingSlideDuration}
          onSaveSlideDuration={() => void handleSaveSlideDuration()}
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
        />
        <UpgradeModal visible={upgradeModalVisible} onDismiss={() => setUpgradeModalVisible(false)} />
      </>
    );
  }

  return (
    <View style={styles.screen}>
      <AdminTopBar
        profiles={profiles}
        activeProfileId={activeProfileId}
        plan={plan}
        onActivateProfile={(id) => void activateProfile(id)}
        onCreateProfile={() => setCreateProfileModalVisible(true)}
        onManageProfiles={() => setIsSettingsOpen(true)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onUpgradePlan={() => setUpgradeModalVisible(true)}
        onEnterDisplayMode={onEnterDisplayMode}
        onEnterRemoteControlMode={onEnterRemoteControlMode}
        onLogout={onLogout}
      />

      <View style={styles.body}>
        <WidgetSidebar
          plan={plan}
          hasFeature={hasFeature}
          onUpgradePress={() => setUpgradeModalVisible(true)}
          selectedLibraryWidgetType={selectedLibraryWidgetType}
          onSelectLibraryWidget={(type) => {
            setSelectedLibraryWidgetType(type);
            setInspectorMode("library");
          }}
          inspectorMode={inspectorMode}
          selectedWidget={selectedWidget}
          onSaveConfig={(id, config) => handleSaveWidgetConfig(id, config)}
        />

        <View style={styles.canvasArea}>
          <DashboardCanvas
            widgets={layoutWidgets}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={(widgetId) => {
              setSelectedWidgetId(widgetId);
              setInspectorMode("canvas");
            }}
            onClearSelection={() => {
              setSelectedWidgetId(null);
              setInspectorMode(selectedLibraryWidgetType ? "library" : null);
            }}
            onWidgetLayoutChange={handleWidgetLayoutChange}
            onRemoveWidget={(widgetId) => void handleRemoveWidgetFromCanvas(widgetId)}
            loadingLayout={loadingLayout}
            error={layoutLoadError}
            onRetry={() => void loadDisplayLayout(true)}
            hasLayoutChanges={hasLayoutChanges}
            savingLayout={savingLayout}
            layoutError={layoutError}
            onSaveLayout={() => void handleSaveLayout()}
            onCancelLayout={() => handleCancelLayout()}
            widgetPlacementError={widgetPlacementError}
            onClearCanvas={() => setConfirmClearCanvas(true)}
            clearCanvasDisabled={!activeProfileId || layoutWidgets.length === 0 || clearingCanvas}
            clearingCanvas={clearingCanvas}
            onWidgetDropped={(widgetType, layout) =>
              void handlePlaceWidgetFromLibrary(widgetType, layout)
            }
          />
          <SlideRail
            slides={slides}
            activeSlideId={activeSlideId}
            onSelectSlide={handleSelectSlide}
            onCreateSlide={(name) => handleCreateSlide(name)}
            onDeleteSlide={(slideId) => handleDeleteSlide(slideId)}
            onRenameSlide={(slideId, name) => handleRenameSlide(slideId, name)}
          />
        </View>
      </View>

      <UpgradeModal visible={upgradeModalVisible} onDismiss={() => setUpgradeModalVisible(false)} />

      {/* Floating skeleton that follows the cursor during widget library drag */}
      <WidgetDragPreviewOverlay />

      <ConfirmDialog
        visible={confirmClearCanvas}
        title="Clear Canvas"
        message="Are you sure you want to remove all widgets from all slides in this profile?"
        warningText="This cannot be undone. All widgets across every slide will be permanently removed."
        confirmLabel="Clear Canvas"
        loading={clearingCanvas}
        onConfirm={() => {
          setConfirmClearCanvas(false);
          void handleClearCanvas();
        }}
        onCancel={() => setConfirmClearCanvas(false)}
      />

      <DialogModal
        visible={createProfileModalVisible}
        title="Create Profile"
        onRequestClose={() => {
          setCreateProfileModalVisible(false);
          setNewProfileName("");
          setProfileError(null);
        }}
        footer={
          <View style={styles.dialogActions}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Cancel create profile"
              style={styles.dialogCancelButton}
              onPress={() => {
                setCreateProfileModalVisible(false);
                setNewProfileName("");
                setProfileError(null);
              }}
            >
              <Text style={styles.dialogCancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Confirm create profile"
              style={[
                styles.dialogConfirmButton,
                creatingProfile ? styles.dialogButtonDisabled : null,
              ]}
              onPress={() => {
                void handleCreateProfile().then(() => {
                  setCreateProfileModalVisible(false);
                });
              }}
              disabled={creatingProfile}
            >
              <Text style={styles.dialogConfirmLabel}>
                {creatingProfile ? "Creating…" : "Create"}
              </Text>
            </Pressable>
          </View>
        }
      >
        <View style={styles.dialogBody}>
          <TextInput
            accessibilityLabel="Profile name input"
            style={styles.dialogInput}
            value={newProfileName}
            onChangeText={setNewProfileName}
            placeholder="Profile name"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
          {profileError ? (
            <Text style={styles.dialogError}>{profileError}</Text>
          ) : null}
        </View>
      </DialogModal>
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
  canvasArea: {
    flex: 1,
    flexDirection: "column",
  },
  dialogBody: {
    gap: spacing.sm,
  },
  dialogInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: 6,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dialogError: {
    ...typography.small,
    color: colors.statusDangerText,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  dialogCancelButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dialogCancelLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  dialogConfirmButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentBlue,
    borderRadius: 6,
  },
  dialogButtonDisabled: {
    opacity: 0.55,
  },
  dialogConfirmLabel: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
