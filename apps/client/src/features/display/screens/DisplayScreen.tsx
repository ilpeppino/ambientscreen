import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  BackHandler,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { ConfirmDialog } from "../../../shared/ui/overlays";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import { DisplayFrame } from "../../../shared/ui/layout/DisplayFrame";
import {
  WidgetHeader,
  WidgetState,
  WidgetSurface,
} from "../../../shared/ui/widgets";
import {
  getDisplayFrameModel,
  getDisplayStatusModel,
  shouldShowDisplayEditControls,
} from "../displayScreen.logic";
import { LayoutGrid } from "../components/LayoutGrid";
import { EditModeHint } from "../components/EditModeHint";
import { WidgetSettingsModal } from "../components/WidgetSettingsModal";
import { shouldShowEditModeHint } from "../components/editMode.logic";
import { getWidgetPlugin } from "../../../widgets/pluginRegistry";
import { registerBuiltinWidgetPlugins } from "../../../widgets/registerBuiltinPlugins";
import { useCloudProfiles } from "../../profiles/useCloudProfiles";
import { useRealtimeDisplaySync } from "../hooks/useRealtimeDisplaySync";
import { useSharedScreenSession } from "../hooks/useSharedScreenSession";
import { API_BASE_URL } from "../../../core/config/api";
import { createOrchestrationEngine } from "../services/orchestrationEngine";
import { subscribeRemoteCommands } from "../../remoteControl/services/remoteCommandBus";
import { updateOrchestrationRule } from "../../../services/api/orchestrationRulesApi";
import {
  disableDisplayKeepAwake,
  enableDisplayKeepAwake,
} from "../services/keepAwake";
import {
  lockDisplayLandscape,
  unlockDisplayOrientation,
} from "../services/orientation";
import { useDisplayData } from "../hooks/useDisplayData";
import { useEditModeOps } from "../hooks/useEditMode";
import { useSlideshowConfig } from "../hooks/useSlideshowConfig";
import { useWidgetSettings } from "../hooks/useWidgetSettings";
import { useDashboardTransition } from "../hooks/useDashboardTransition";
import { DisplayEditPanel } from "../components/DisplayEditPanel";
import { applyWidgetConfigUpdate } from "../components/WidgetSettingsModal.logic";

interface DisplayScreenProps {
  deviceId?: string | null;
  onExitDisplayMode?: () => void;
}

const WIDGET_TRANSITION_LIBRARY = "react-native Animated API";

export function DisplayScreen({ deviceId, onExitDisplayMode }: DisplayScreenProps) {
  registerBuiltinWidgetPlugins();

  const {
    profiles,
    activeProfileId,
    profilesError,
    activateProfile,
  } = useCloudProfiles();

  const [editMode, setEditMode] = useState(false);
  const [isAppActive, setIsAppActive] = useState(true);
  const [pendingExitDisplay, setPendingExitDisplay] = useState(false);
  const [newSharedSessionName, setNewSharedSessionName] = useState("Main shared session");

  const fallbackDeviceIdRef = useRef(`display-${Math.random().toString(36).slice(2, 10)}`);
  const effectiveDeviceId = deviceId ?? fallbackDeviceIdRef.current;
  const markTransitionPendingRef = useRef(() => undefined as void);

  const {
    availableSessions,
    sharedSession,
    connectionState: sharedSessionConnectionState,
    loadingSessions: loadingSharedSessions,
    loadingSessionState: loadingSharedSessionState,
    error: sharedSessionError,
    refreshSessions: refreshSharedSessions,
    createAndJoinSession,
    joinSessionById,
    leaveCurrentSession,
    patchCurrentSession,
  } = useSharedScreenSession({
    apiBaseUrl: API_BASE_URL,
    deviceId: effectiveDeviceId,
    displayName: "Display device",
  });

  const isSharedMode = sharedSession !== null;
  const effectiveActiveProfileId = isSharedMode ? sharedSession.activeProfileId : activeProfileId;

  const setActiveProfile = useCallback(async (profileId: string) => {
    if (activeProfileId === profileId) {
      return;
    }

    markTransitionPendingRef.current();
    await activateProfile(profileId);
  }, [activeProfileId, activateProfile]);

  const realtimeConnectionState = useRealtimeDisplaySync({
    apiBaseUrl: API_BASE_URL,
    activeProfileId: effectiveActiveProfileId,
    enabled: !editMode,
    onRefreshRequested: () => {
      void displayData.loadDisplayLayout(false);
    },
  });

  const displayData = useDisplayData({
    effectiveActiveProfileId,
    editMode,
    isAppActive,
    realtimeConnectionState,
  });

  const {
    widgets,
    setWidgets,
    loadingLayout,
    error,
    setError,
    loadDisplayLayout,
    loadDisplayLayoutRef,
    saveWidgetLayouts,
  } = displayData;

  const orchestrationEngineRef = useRef(
    createOrchestrationEngine({
      onRefresh: async () => {
        await loadDisplayLayoutRef.current(false);
      },
      onSwitchProfile: async (profileId: string) => {
        await setActiveProfile(profileId);
      },
    }),
  );

  const editOps = useEditModeOps({
    editMode,
    setEditMode,
    widgets,
    effectiveActiveProfileId,
    saveWidgetLayouts,
    onAfterSave: async () => {
      await loadDisplayLayout(false);
    },
  });

  const {
    selectedWidgetId,
    setSelectedWidgetId,
    savingLayout,
    layoutError,
    setLayoutError,
    hasLayoutChanges,
    layoutWidgets,
    handleToggleEditMode,
    handleWidgetLayoutChange,
    handleCancelLayout,
    handleSaveLayout,
  } = editOps;

  const {
    slideshowEnabled,
    setSlideshowEnabled,
    slideshowIntervalSecInput,
    setSlideshowIntervalSecInput,
    slideshowProfileIds,
    slideshowRuleId,
    slideshowSaveError,
    savingSlideshow,
    handleSaveSlideshow,
    toggleSlideshowProfileId,
  } = useSlideshowConfig({
    isSharedMode,
    profiles,
    effectiveActiveProfileId,
    patchCurrentSession,
    sharedSessionSlideshowEnabled: sharedSession?.slideshowEnabled,
    sharedSessionIntervalSec: sharedSession?.slideshowIntervalSec,
    sharedSessionRotationProfileIds: sharedSession?.rotationProfileIds,
    onAfterSave: async () => {
      await orchestrationEngineRef.current.reload();
    },
  });

  const widgetSettings = useWidgetSettings({
    widgets,
    effectiveActiveProfileId,
    onAfterSave: async () => {
      await loadDisplayLayout(false);
    },
    onWidgetConfigUpdated: (widgetInstanceId, config) => {
      setWidgets((current) => applyWidgetConfigUpdate(current, widgetInstanceId, config));
    },
  });

  const {
    settingsWidgetId,
    settingsWidget,
    savingWidgetConfig,
    widgetConfigError,
    setWidgetConfigError,
    handleOpenWidgetSettings,
    handleCloseWidgetSettings,
    handleSaveWidgetConfig,
  } = widgetSettings;

  const {
    renderedWidgets,
    outgoingWidgets,
    dashboardTransitionType,
    dashboardIncomingOpacity,
    dashboardOutgoingOpacity,
    dashboardIncomingSlide,
    markTransitionPending,
  } = useDashboardTransition({ layoutWidgets, editMode, isAppActive });

  markTransitionPendingRef.current = markTransitionPending;

  // Keep screen awake and lock orientation while in display mode
  useEffect(() => {
    enableDisplayKeepAwake();
    lockDisplayLandscape();

    return () => {
      disableDisplayKeepAwake();
      unlockDisplayOrientation();
    };
  }, []);

  // Track app foreground/background state
  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  // Log animation stack on mount
  useEffect(() => {
    console.info("[display] animation stack", {
      dashboardTransitionType,
      widgetAnimations: WIDGET_TRANSITION_LIBRARY,
    });
  }, [dashboardTransitionType]);

  // Orchestration engine lifecycle
  useEffect(() => {
    const orchestrationEngine = orchestrationEngineRef.current;
    if (!activeProfileId || isSharedMode || editMode || !isAppActive) {
      orchestrationEngine.stop();
      return () => undefined;
    }

    void orchestrationEngine.start();
    return () => {
      orchestrationEngine.stop();
    };
  }, [activeProfileId, editMode, isAppActive, isSharedMode]);

  // Remote command subscription
  useEffect(() => {
    const unsubscribe = subscribeRemoteCommands((command) => {
      if (command.type === "REFRESH") {
        void loadDisplayLayout(false);
        return;
      }

      if (command.type === "SET_PROFILE") {
        void setActiveProfile(command.profileId).catch((error) => {
          console.error(error);
        });
        return;
      }

      setSlideshowEnabled(command.enabled);
      if (isSharedMode) {
        void patchCurrentSession({ slideshowEnabled: command.enabled });
        return;
      }

      const ruleId = slideshowRuleId;
      if (!ruleId) {
        return;
      }

      void (async () => {
        try {
          await updateOrchestrationRule(ruleId, { isActive: command.enabled });
          await orchestrationEngineRef.current.reload();
        } catch (error) {
          console.error(error);
        }
      })();
    });

    return unsubscribe;
  }, [
    isSharedMode,
    loadDisplayLayout,
    patchCurrentSession,
    setActiveProfile,
    setSlideshowEnabled,
    slideshowRuleId,
  ]);

  // Guard exit when in edit mode with unsaved layout changes
  const handleExitDisplayRequest = useCallback(() => {
    if (editMode && hasLayoutChanges) {
      setPendingExitDisplay(true);
      return;
    }

    if (editMode) {
      handleCancelLayout();
    }

    onExitDisplayMode?.();
  }, [editMode, handleCancelLayout, hasLayoutChanges, onExitDisplayMode]);

  // Android hardware back: close modal → cancel edit → exit display
  useEffect(() => {
    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      if (settingsWidgetId !== null && !savingWidgetConfig) {
        setWidgetConfigError(null);
        widgetSettings.handleCloseWidgetSettings();
        return true;
      }

      if (pendingExitDisplay) {
        setPendingExitDisplay(false);
        return true;
      }

      if (editMode) {
        setError(null);
        setLayoutError(null);
        handleCancelLayout();
        return true;
      }

      if (onExitDisplayMode) {
        onExitDisplayMode();
        return true;
      }

      return false;
    });

    return () => {
      subscription.remove();
    };
  }, [
    editMode,
    handleCancelLayout,
    onExitDisplayMode,
    pendingExitDisplay,
    savingWidgetConfig,
    setError,
    setLayoutError,
    setWidgetConfigError,
    settingsWidgetId,
    widgetSettings,
  ]);

  const frameModel = getDisplayFrameModel(undefined);
  const hasWidgets = renderedWidgets.length > 0;
  const hasAnyDashboardWidgets = hasWidgets || Boolean(outgoingWidgets?.length);
  const showEditControls = shouldShowDisplayEditControls(editMode);
  const displayError = error ?? layoutError;

  const content = useMemo(() => {
    if (loadingLayout && !hasAnyDashboardWidgets) {
      const model = getDisplayStatusModel("loadingWidgets", null);
      return (
        <DisplayStatusContent
          icon="refresh"
          title={model.title}
          message={model.message}
          type="loading"
        />
      );
    }

    if (!hasAnyDashboardWidgets && displayError) {
      const model = getDisplayStatusModel("error", displayError);
      return (
        <DisplayStatusContent
          icon="close"
          title={model.title}
          message={model.message}
          type="error"
        />
      );
    }

    if (!hasAnyDashboardWidgets) {
      const model = getDisplayStatusModel("empty", null);
      return (
        <DisplayStatusContent
          icon="grid"
          title={model.title}
          message={model.message}
          type="empty"
        />
      );
    }

    return (
      <View style={styles.dashboardLayerStack}>
        <Animated.View
          style={[
            styles.dashboardLayer,
            {
              opacity: dashboardIncomingOpacity,
              transform: [{ translateX: dashboardIncomingSlide }],
            },
          ]}
        >
          <LayoutGrid
            widgets={renderedWidgets}
            editMode={editMode}
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={setSelectedWidgetId}
            onClearWidgetSelection={() => setSelectedWidgetId(null)}
            onWidgetLayoutChange={handleWidgetLayoutChange}
            onOpenWidgetSettings={(widgetId) => {
              handleOpenWidgetSettings(widgetId, setSelectedWidgetId);
            }}
          />
        </Animated.View>
        {outgoingWidgets ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.dashboardLayer,
              { opacity: dashboardOutgoingOpacity },
            ]}
          >
            <LayoutGrid widgets={outgoingWidgets} />
          </Animated.View>
        ) : null}
        <EditModeHint visible={shouldShowEditModeHint(editMode, selectedWidgetId)} />
      </View>
    );
  }, [
    dashboardIncomingOpacity,
    dashboardIncomingSlide,
    dashboardOutgoingOpacity,
    displayError,
    editMode,
    handleOpenWidgetSettings,
    handleWidgetLayoutChange,
    hasAnyDashboardWidgets,
    loadingLayout,
    outgoingWidgets,
    renderedWidgets,
    selectedWidgetId,
    setSelectedWidgetId,
  ]);

  return (
    <View style={styles.screen}>
      {onExitDisplayMode ? (
        <View style={styles.exitButtonContainer}>
          <Pressable
            accessibilityRole="button"
            style={styles.exitButton}
            onPress={handleExitDisplayRequest}
          >
            <Text style={styles.exitButtonLabel}>Exit Display</Text>
          </Pressable>
        </View>
      ) : null}
      {!showEditControls ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Enter edit mode"
          style={styles.hiddenEditTrigger}
          delayLongPress={450}
          onLongPress={handleToggleEditMode}
        />
      ) : null}
      {showEditControls ? (
        <DisplayEditPanel
          isSharedMode={isSharedMode}
          sharedSession={sharedSession}
          availableSessions={availableSessions}
          sharedSessionConnectionState={sharedSessionConnectionState}
          loadingSharedSessions={loadingSharedSessions}
          loadingSharedSessionState={loadingSharedSessionState}
          newSharedSessionName={newSharedSessionName}
          setNewSharedSessionName={setNewSharedSessionName}
          onRefreshSessions={() => void refreshSharedSessions()}
          onCreateAndJoinSession={(name) => void createAndJoinSession(name)}
          onJoinSessionById={(sessionId) => void joinSessionById(sessionId)}
          onLeaveSession={() => void leaveCurrentSession()}
          onPatchSession={(patch) => void patchCurrentSession(patch)}
          profiles={profiles}
          effectiveActiveProfileId={effectiveActiveProfileId}
          onSetActiveProfile={(profileId) => void setActiveProfile(profileId)}
          slideshowEnabled={slideshowEnabled}
          setSlideshowEnabled={setSlideshowEnabled}
          slideshowProfileIds={slideshowProfileIds}
          slideshowIntervalSecInput={slideshowIntervalSecInput}
          setSlideshowIntervalSecInput={setSlideshowIntervalSecInput}
          slideshowSaveError={slideshowSaveError}
          savingSlideshow={savingSlideshow}
          onToggleSlideshowProfileId={toggleSlideshowProfileId}
          onSaveSlideshow={() => void handleSaveSlideshow()}
          editMode={editMode}
          onToggleEditMode={handleToggleEditMode}
        />
      ) : null}
      {showEditControls ? (
        <View style={styles.layoutActionsContainer}>
          <Pressable
            accessibilityRole="button"
            style={[styles.layoutActionButton, styles.layoutCancelButton]}
            onPress={() => {
              setError(null);
              setLayoutError(null);
              handleCancelLayout({
                onCleared: () => {
                  setWidgetConfigError(null);
                },
              });
            }}
            disabled={savingLayout}
          >
            <Text style={styles.layoutActionLabel}>Cancel</Text>
          </Pressable>
          <Pressable
            accessibilityRole="button"
            style={[
              styles.layoutActionButton,
              styles.layoutSaveButton,
              !hasLayoutChanges || savingLayout ? styles.layoutActionDisabled : null,
            ]}
            onPress={() => void handleSaveLayout()}
            disabled={!hasLayoutChanges || savingLayout}
          >
            <Text style={styles.layoutActionLabel}>{savingLayout ? "Saving..." : "Save Layout"}</Text>
          </Pressable>
        </View>
      ) : null}
      <DisplayFrame
        title={frameModel.title}
        subtitle={frameModel.subtitle}
        footer={<Text style={styles.footerText}>{hasWidgets ? `${renderedWidgets.length} widgets live` : frameModel.footerLabel}</Text>}
      >
        {content}
      </DisplayFrame>
      {profilesError || sharedSessionError ? (
        <Text style={styles.profileError}>{profilesError ?? sharedSessionError}</Text>
      ) : null}
      {settingsWidget ? (
        <WidgetSettingsModal
          visible={Boolean(settingsWidget)}
          widgetName={getWidgetPlugin(settingsWidget.widgetKey)?.manifest.name ?? settingsWidget.widgetKey}
          schema={settingsWidget.configSchema}
          config={settingsWidget.config}
          saving={savingWidgetConfig}
          saveError={widgetConfigError}
          onClose={handleCloseWidgetSettings}
          onSave={handleSaveWidgetConfig}
        />
      ) : null}
      <ConfirmDialog
        visible={pendingExitDisplay}
        title="Exit without saving?"
        message="Your unsaved layout changes will be lost."
        confirmLabel="Exit"
        confirmTone="destructive"
        onConfirm={() => {
          setPendingExitDisplay(false);
          setError(null);
          setLayoutError(null);
          handleCancelLayout();
          onExitDisplayMode?.();
        }}
        onCancel={() => {
          setPendingExitDisplay(false);
        }}
      />
    </View>
  );
}

interface DisplayStatusContentProps {
  icon: "refresh" | "close" | "grid";
  title: string;
  message: string;
  type: "loading" | "error" | "empty";
}

function DisplayStatusContent({
  icon,
  title,
  message,
  type,
}: DisplayStatusContentProps) {
  return (
    <View style={styles.centered}>
      <WidgetSurface style={styles.statusCard}>
        <WidgetHeader mode="display" icon={icon} title={title} />
        <WidgetState type={type} message={message} />
      </WidgetSurface>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  exitButtonContainer: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 20,
  },
  exitButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(0, 0, 0, 0.86)",
  },
  exitButtonLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: spacing.xl,
  },
  hiddenEditTrigger: {
    position: "absolute",
    left: spacing.md,
    top: spacing.md,
    width: 60,
    height: 60,
    zIndex: 12,
  },
  dashboardLayerStack: {
    flex: 1,
    position: "relative",
  },
  dashboardLayer: {
    ...StyleSheet.absoluteFillObject,
  },
  statusCard: {
    width: "100%",
    maxWidth: 560,
    paddingHorizontal: spacing.xl,
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: colors.textSecondary,
    fontSize: typography.small.fontSize,
    letterSpacing: 0.4,
  },
  profileError: {
    position: "absolute",
    bottom: 10,
    left: 18,
    right: 18,
    color: colors.error,
    fontSize: typography.caption.fontSize,
    textAlign: "center",
  },
  layoutActionsContainer: {
    position: "absolute",
    top: 18,
    left: spacing.screenPadding,
    zIndex: 20,
    flexDirection: "row",
    gap: 10,
  },
  layoutActionButton: {
    borderWidth: 1,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  layoutCancelButton: {
    borderColor: colors.border,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  layoutSaveButton: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  layoutActionDisabled: {
    opacity: 0.45,
  },
  layoutActionLabel: {
    color: colors.statusInfoText,
    fontSize: typography.caption.fontSize,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
});
