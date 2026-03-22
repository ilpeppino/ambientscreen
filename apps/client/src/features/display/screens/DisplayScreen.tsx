import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Animated,
  AppState,
  Easing,
  Pressable,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { TextInput as AppTextInput } from "../../../shared/ui/components";
import {
  getDisplayLayout,
  type DisplayLayoutWidgetEnvelope,
  updateWidgetConfig,
  updateWidgetsLayout,
} from "../../../services/api/displayLayoutApi";
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
  WidgetHeader,
  WidgetState,
  WidgetSurface,
} from "../../../shared/ui/widgets";
import {
  getEffectivePollingIntervalMs,
  getDisplayFrameModel,
  getDisplayRefreshIntervalMs,
  getDisplayStatusModel,
  shouldShowDisplayEditControls,
} from "../displayScreen.logic";
import { LayoutGrid } from "../components/LayoutGrid";
import { EditModeHint } from "../components/EditModeHint";
import { WidgetSettingsModal } from "../components/WidgetSettingsModal";
import { applyWidgetConfigUpdate } from "../components/WidgetSettingsModal.logic";
import {
  clampWidgetLayout,
  normalizeWidgetLayouts,
  resolveWidgetLayoutCollision,
  type WidgetLayout,
} from "../components/LayoutGrid.logic";
import { shouldShowEditModeHint } from "../components/editMode.logic";
import {
  getWidgetPlugin,
} from "../../../widgets/pluginRegistry";
import { registerBuiltinWidgetPlugins } from "../../../widgets/registerBuiltinPlugins";
import { useCloudProfiles } from "../../profiles/useCloudProfiles";
import { useRealtimeDisplaySync } from "../hooks/useRealtimeDisplaySync";
import { useSharedScreenSession } from "../hooks/useSharedScreenSession";
import { API_BASE_URL } from "../../../core/config/api";
import { createOrchestrationEngine } from "../services/orchestrationEngine";
import {
  createTransitionManager,
  transitionPresets,
  type TransitionType,
} from "../animations/transitionManager";
import {
  createOrchestrationRule,
  getOrchestrationRules,
  updateOrchestrationRule,
} from "../../../services/api/orchestrationRulesApi";
import { subscribeRemoteCommands } from "../../remoteControl/services/remoteCommandBus";

interface DisplayScreenProps {
  deviceId?: string | null;
  onExitDisplayMode?: () => void;
}

const FALLBACK_REFRESH_INTERVAL_MS = 30000;
const DISPLAY_TRANSITION_TYPE: TransitionType = "fade";
const WIDGET_TRANSITION_LIBRARY = "react-native Animated API";

export function DisplayScreen({ deviceId, onExitDisplayMode }: DisplayScreenProps) {
  registerBuiltinWidgetPlugins();

  const {
    profiles,
    activeProfileId,
    profilesError,
    activateProfile,
  } = useCloudProfiles();
  const [widgets, setWidgets] = useState<DisplayLayoutWidgetEnvelope[]>([]);
  const [draftLayoutsByWidgetId, setDraftLayoutsByWidgetId] = useState<Record<string, WidgetLayout>>({});
  const [loadingLayout, setLoadingLayout] = useState(true);
  const [savingLayout, setSavingLayout] = useState(false);
  const [savingWidgetConfig, setSavingWidgetConfig] = useState(false);
  const [editMode, setEditMode] = useState(false);
  const [selectedWidgetId, setSelectedWidgetId] = useState<string | null>(null);
  const [settingsWidgetId, setSettingsWidgetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [widgetConfigError, setWidgetConfigError] = useState<string | null>(null);
  const [slideshowEnabled, setSlideshowEnabled] = useState(false);
  const [slideshowIntervalSecInput, setSlideshowIntervalSecInput] = useState("60");
  const [slideshowProfileIds, setSlideshowProfileIds] = useState<string[]>([]);
  const [slideshowRuleId, setSlideshowRuleId] = useState<string | null>(null);
  const [slideshowSaveError, setSlideshowSaveError] = useState<string | null>(null);
  const [savingSlideshow, setSavingSlideshow] = useState(false);
  const [newSharedSessionName, setNewSharedSessionName] = useState("Main shared session");
  const [isAppActive, setIsAppActive] = useState(true);
  const [dashboardTransitionType] = useState<TransitionType>(DISPLAY_TRANSITION_TYPE);
  const [renderedWidgets, setRenderedWidgets] = useState<DisplayLayoutWidgetEnvelope[]>([]);
  const [outgoingWidgets, setOutgoingWidgets] = useState<DisplayLayoutWidgetEnvelope[] | null>(null);
  const transitionManagerRef = useRef(createTransitionManager<DisplayLayoutWidgetEnvelope[]>({
    transitionType: DISPLAY_TRANSITION_TYPE,
    initialDashboard: [],
  }));
  const transitionPendingRef = useRef(false);
  const dashboardTransitionAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const dashboardIncomingOpacity = useRef(new Animated.Value(1)).current;
  const dashboardOutgoingOpacity = useRef(new Animated.Value(0)).current;
  const dashboardIncomingSlide = useRef(new Animated.Value(0)).current;
  const fallbackDeviceIdRef = useRef(`display-${Math.random().toString(36).slice(2, 10)}`);
  const effectiveDeviceId = deviceId ?? fallbackDeviceIdRef.current;

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

    transitionPendingRef.current = true;
    await activateProfile(profileId);
  }, [activeProfileId, activateProfile]);

  useEffect(() => {
    enableDisplayKeepAwake();
    lockDisplayLandscape();

    return () => {
      disableDisplayKeepAwake();
      unlockDisplayOrientation();
    };
  }, []);

  const refreshIntervalMs = useMemo(() => {
    const intervals = widgets
      .map((widget) => getDisplayRefreshIntervalMs(widget.widgetKey))
      .filter((interval): interval is number => interval !== null);

    if (intervals.length === 0) {
      return FALLBACK_REFRESH_INTERVAL_MS;
    }

    return Math.min(...intervals);
  }, [widgets]);

  const loadDisplayLayout = useCallback(async (showInitialLoading: boolean) => {
    if (!effectiveActiveProfileId) {
      setWidgets([]);
      setDraftLayoutsByWidgetId({});
      setLoadingLayout(false);
      return;
    }

    try {
      if (showInitialLoading) {
        setLoadingLayout(true);
      }

      const response = await getDisplayLayout(effectiveActiveProfileId);
      const normalizedWidgets = withNormalizedLayouts(response.widgets);
      setWidgets(normalizedWidgets);
      setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(normalizedWidgets));
      setError(null);
      setWidgetConfigError(null);
    } catch (err) {
      console.error(err);
      setError(toErrorMessage(err, "Failed to load display layout"));
      if (showInitialLoading) {
        setWidgets([]);
      }
    } finally {
      if (showInitialLoading) {
        setLoadingLayout(false);
      }
    }
  }, [effectiveActiveProfileId]);

  const loadDisplayLayoutRef = useRef(loadDisplayLayout);
  loadDisplayLayoutRef.current = loadDisplayLayout;

  const loadSlideshowConfiguration = useCallback(async () => {
    if (isSharedMode) {
      return;
    }

    try {
      setSlideshowSaveError(null);
      const rules = await getOrchestrationRules();
      const rotationRule = rules.find((rule) => rule.type === "rotation") ?? null;
      if (!rotationRule) {
        setSlideshowRuleId(null);
        setSlideshowEnabled(false);
        setSlideshowIntervalSecInput("60");
        setSlideshowProfileIds([]);
        return;
      }

      setSlideshowRuleId(rotationRule.id);
      setSlideshowEnabled(rotationRule.isActive);
      setSlideshowIntervalSecInput(String(rotationRule.intervalSec));
      setSlideshowProfileIds(rotationRule.rotationProfileIds);
    } catch (error) {
      console.error(error);
      setSlideshowSaveError("Failed to load slideshow settings");
    }
  }, [isSharedMode]);

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

  const realtimeConnectionState = useRealtimeDisplaySync({
    apiBaseUrl: API_BASE_URL,
    activeProfileId: effectiveActiveProfileId,
    enabled: !editMode,
    onRefreshRequested: () => {
      void loadDisplayLayout(false);
    },
  });

  const effectivePollingIntervalMs = useMemo(
    () => getEffectivePollingIntervalMs(refreshIntervalMs, realtimeConnectionState),
    [refreshIntervalMs, realtimeConnectionState],
  );

  useEffect(() => {
    if (profiles.length === 0 || isSharedMode) {
      return;
    }

    void loadSlideshowConfiguration();
  }, [isSharedMode, loadSlideshowConfiguration, profiles.length]);

  useEffect(() => {
    if (!sharedSession) {
      return;
    }

    setSlideshowEnabled(sharedSession.slideshowEnabled);
    setSlideshowIntervalSecInput(String(sharedSession.slideshowIntervalSec));
    setSlideshowProfileIds(sharedSession.rotationProfileIds);
  }, [sharedSession]);

  useEffect(() => {
    const availableProfileIds = new Set(profiles.map((profile) => profile.id));
    setSlideshowProfileIds((current) => current.filter((profileId) => availableProfileIds.has(profileId)));
    if (profiles.length < 2) {
      setSlideshowEnabled(false);
    }
  }, [profiles]);

  useEffect(() => {
    const subscription = AppState.addEventListener("change", (nextState) => {
      setIsAppActive(nextState === "active");
    });

    return () => {
      subscription.remove();
    };
  }, []);

  useEffect(() => {
    transitionManagerRef.current.setTransitionType(dashboardTransitionType);
  }, [dashboardTransitionType]);

  const previousEffectiveProfileIdRef = useRef<string | null>(null);
  useEffect(() => {
    const previousProfileId = previousEffectiveProfileIdRef.current;
    if (previousProfileId && effectiveActiveProfileId && previousProfileId !== effectiveActiveProfileId) {
      transitionPendingRef.current = true;
    }
    previousEffectiveProfileIdRef.current = effectiveActiveProfileId;
  }, [effectiveActiveProfileId]);

  useEffect(() => {
    if (isAppActive) {
      return;
    }

    transitionPendingRef.current = false;
    dashboardTransitionAnimationRef.current?.stop();
    dashboardTransitionAnimationRef.current = null;
    transitionManagerRef.current.cancelDashboardTransition();
    setOutgoingWidgets(null);
  }, [isAppActive]);

  useEffect(() => {
    console.info("[display] animation stack", {
      dashboardTransitionType,
      widgetAnimations: WIDGET_TRANSITION_LIBRARY,
    });
  }, [dashboardTransitionType]);

  useEffect(() => {
    let cancelled = false;

    async function runInitialLoad() {
      if (cancelled) {
        return;
      }

      await loadDisplayLayout(true);
    }

    void runInitialLoad();

    return () => {
      cancelled = true;
    };
  }, [effectiveActiveProfileId, loadDisplayLayout]);

  useEffect(() => {
    if (editMode || !isAppActive) {
      return () => undefined;
    }

    const intervalId = setInterval(() => {
      void loadDisplayLayout(false);
    }, effectivePollingIntervalMs);

    return () => {
      clearInterval(intervalId);
    };
  }, [editMode, effectivePollingIntervalMs, isAppActive, loadDisplayLayout]);

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
        void patchCurrentSession({
          slideshowEnabled: command.enabled,
        });
        return;
      }

      if (!slideshowRuleId) {
        return;
      }

      void (async () => {
        try {
          await updateOrchestrationRule(slideshowRuleId, {
            isActive: command.enabled,
          });
          await orchestrationEngineRef.current.reload();
        } catch (error) {
          console.error(error);
          setSlideshowSaveError(toErrorMessage(error, "Failed to apply remote slideshow command"));
        }
      })();
    });

    return unsubscribe;
  }, [
    isSharedMode,
    loadDisplayLayout,
    patchCurrentSession,
    setActiveProfile,
    slideshowRuleId,
  ]);

  const toggleSlideshowProfileId = useCallback((profileId: string) => {
    setSlideshowProfileIds((current) => {
      if (current.includes(profileId)) {
        return current.filter((id) => id !== profileId);
      }
      return [...current, profileId];
    });
  }, []);

  const handleSaveSlideshow = useCallback(async () => {
    if (savingSlideshow) {
      return;
    }

    try {
      setSavingSlideshow(true);
      setSlideshowSaveError(null);

      if (isSharedMode) {
        const parsedIntervalSec = Number.parseInt(slideshowIntervalSecInput.trim(), 10);
        if (Number.isNaN(parsedIntervalSec) || parsedIntervalSec <= 0) {
          setSlideshowSaveError("Slideshow interval must be a positive number");
          return;
        }

        const normalizedProfileIds = slideshowEnabled ? slideshowProfileIds : [];
        if (slideshowEnabled && normalizedProfileIds.length < 2) {
          setSlideshowSaveError("Select at least two profiles for slideshow mode");
          return;
        }

        await patchCurrentSession({
          slideshowEnabled,
          slideshowIntervalSec: parsedIntervalSec,
          rotationProfileIds: normalizedProfileIds,
          currentIndex: 0,
          activeProfileId: normalizedProfileIds.length > 0
            ? normalizedProfileIds[0]
            : effectiveActiveProfileId,
        });
        return;
      }

      if (!slideshowEnabled) {
        if (!slideshowRuleId) {
          return;
        }

        await updateOrchestrationRule(slideshowRuleId, {
          isActive: false,
        });
      } else {
        const parsedIntervalSec = Number.parseInt(slideshowIntervalSecInput.trim(), 10);
        if (Number.isNaN(parsedIntervalSec) || parsedIntervalSec <= 0) {
          setSlideshowSaveError("Slideshow interval must be a positive number");
          return;
        }

        if (slideshowProfileIds.length < 2) {
          setSlideshowSaveError("Select at least two profiles for slideshow mode");
          return;
        }

        if (!slideshowRuleId) {
          const createdRule = await createOrchestrationRule({
            type: "rotation",
            intervalSec: parsedIntervalSec,
            isActive: true,
            rotationProfileIds: slideshowProfileIds,
          });
          setSlideshowRuleId(createdRule.id);
        } else {
          await updateOrchestrationRule(slideshowRuleId, {
            type: "rotation",
            intervalSec: parsedIntervalSec,
            isActive: true,
            rotationProfileIds: slideshowProfileIds,
            currentIndex: 0,
          });
        }
      }

      await orchestrationEngineRef.current.reload();
    } catch (error) {
      console.error(error);
      setSlideshowSaveError(toErrorMessage(error, "Failed to save slideshow settings"));
    } finally {
      setSavingSlideshow(false);
    }
  }, [
    effectiveActiveProfileId,
    isSharedMode,
    patchCurrentSession,
    savingSlideshow,
    slideshowEnabled,
    slideshowIntervalSecInput,
    slideshowProfileIds,
    slideshowRuleId,
  ]);

  const layoutWidgets = useMemo<DisplayLayoutWidgetEnvelope[]>(() => {
    if (!editMode) {
      return widgets;
    }

    return widgets.map((widget) => ({
      ...widget,
      layout: draftLayoutsByWidgetId[widget.widgetInstanceId] ?? widget.layout,
    }));
  }, [draftLayoutsByWidgetId, editMode, widgets]);

  useEffect(() => {
    const transitionManager = transitionManagerRef.current;
    const shouldAnimate = transitionPendingRef.current
      && !editMode
      && isAppActive
      && dashboardTransitionType !== "none";

    if (!shouldAnimate) {
      const nextState = transitionManager.replaceDashboard(layoutWidgets);
      setRenderedWidgets(nextState.currentDashboard ?? []);
      setOutgoingWidgets(null);
      transitionPendingRef.current = false;
      dashboardTransitionAnimationRef.current?.stop();
      dashboardTransitionAnimationRef.current = null;
      return;
    }

    const nextState = transitionManager.beginDashboardTransition(layoutWidgets);
    setRenderedWidgets(nextState.currentDashboard ?? []);

    if (nextState.phase !== "animating" || !nextState.previousDashboard) {
      setOutgoingWidgets(null);
      transitionPendingRef.current = false;
      return;
    }

    setOutgoingWidgets(nextState.previousDashboard);
    transitionPendingRef.current = false;

    dashboardTransitionAnimationRef.current?.stop();
    const preset = transitionPresets[dashboardTransitionType];
    dashboardIncomingOpacity.setValue(dashboardTransitionType === "fade" ? 0.72 : 0.78);
    dashboardOutgoingOpacity.setValue(1);
    dashboardIncomingSlide.setValue(dashboardTransitionType === "slide" ? 14 : 0);

    const transitionId = nextState.transitionId;
    dashboardTransitionAnimationRef.current = Animated.parallel([
      Animated.timing(dashboardOutgoingOpacity, {
        toValue: 0,
        duration: preset.durationMs,
        easing: Easing.inOut(Easing.quad),
        useNativeDriver: true,
      }),
      Animated.timing(dashboardIncomingOpacity, {
        toValue: 1,
        duration: preset.durationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
      Animated.timing(dashboardIncomingSlide, {
        toValue: 0,
        duration: preset.durationMs,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }),
    ]);

    dashboardTransitionAnimationRef.current.start(({ finished }) => {
      if (!finished) {
        return;
      }

      const completedState = transitionManager.completeDashboardTransition(transitionId);
      setRenderedWidgets(completedState.currentDashboard ?? []);
      setOutgoingWidgets(completedState.previousDashboard);
    });
  }, [
    dashboardIncomingOpacity,
    dashboardIncomingSlide,
    dashboardOutgoingOpacity,
    dashboardTransitionType,
    editMode,
    isAppActive,
    layoutWidgets,
  ]);

  useEffect(() => () => {
    dashboardTransitionAnimationRef.current?.stop();
    dashboardTransitionAnimationRef.current = null;
  }, []);

  const hasLayoutChanges = useMemo(() => {
    if (!editMode) {
      return false;
    }

    return widgets.some((widget) => {
      const draftLayout = draftLayoutsByWidgetId[widget.widgetInstanceId];
      if (!draftLayout) {
        return false;
      }

      return (
        draftLayout.x !== widget.layout.x
        || draftLayout.y !== widget.layout.y
        || draftLayout.w !== widget.layout.w
        || draftLayout.h !== widget.layout.h
      );
    });
  }, [draftLayoutsByWidgetId, editMode, widgets]);

  const handleToggleEditMode = useCallback(() => {
    setError(null);
    setWidgetConfigError(null);
    setEditMode((current) => {
      if (!current) {
        setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(withNormalizedLayouts(widgets)));
      } else {
        setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(withNormalizedLayouts(widgets)));
        setSelectedWidgetId(null);
        setSettingsWidgetId(null);
      }

      return !current;
    });
  }, [widgets]);

  const handleWidgetLayoutChange = useCallback((widgetId: string, layout: WidgetLayout) => {
    setDraftLayoutsByWidgetId((current) => {
      const clampedLayout = clampWidgetLayout({ layout });
      const resolvedLayout = resolveWidgetLayoutCollision({
        widgetId,
        proposedLayout: clampedLayout,
        layoutsById: current,
      });

      return {
        ...current,
        [widgetId]: resolvedLayout,
      };
    });
  }, []);

  const handleCancelLayout = useCallback(() => {
    setDraftLayoutsByWidgetId(buildLayoutsByWidgetId(widgets));
    setSelectedWidgetId(null);
    setSettingsWidgetId(null);
    setEditMode(false);
    setError(null);
    setWidgetConfigError(null);
  }, [widgets]);

  const handleSaveLayout = useCallback(async () => {
    if (!hasLayoutChanges || savingLayout) {
      return;
    }

    try {
      setSavingLayout(true);
      setError(null);

      await updateWidgetsLayout({
        widgets: widgets.map((widget) => ({
          id: widget.widgetInstanceId,
          layout: clampWidgetLayout({
            layout: draftLayoutsByWidgetId[widget.widgetInstanceId] ?? widget.layout,
          }),
        })),
      }, effectiveActiveProfileId ?? undefined);

      await loadDisplayLayout(false);
      setEditMode(false);
      setSelectedWidgetId(null);
    } catch (err) {
      console.error(err);
      setError(toErrorMessage(err, "Failed to save display layout"));
    } finally {
      setSavingLayout(false);
    }
  }, [draftLayoutsByWidgetId, hasLayoutChanges, loadDisplayLayout, savingLayout, widgets]);

  const settingsWidget = useMemo(
    () => widgets.find((widget) => widget.widgetInstanceId === settingsWidgetId) ?? null,
    [settingsWidgetId, widgets],
  );

  const handleOpenWidgetSettings = useCallback((widgetId: string) => {
    setWidgetConfigError(null);
    setSettingsWidgetId(widgetId);
    setSelectedWidgetId(widgetId);
  }, []);

  const handleCloseWidgetSettings = useCallback(() => {
    if (savingWidgetConfig) {
      return;
    }

    setWidgetConfigError(null);
    setSettingsWidgetId(null);
  }, [savingWidgetConfig]);

  const handleSaveWidgetConfig = useCallback(async (config: Record<string, unknown>) => {
    if (!settingsWidget) {
      return;
    }

    try {
      setSavingWidgetConfig(true);
      setWidgetConfigError(null);
      await updateWidgetConfig(settingsWidget.widgetInstanceId, { config }, effectiveActiveProfileId ?? undefined);

      setWidgets((current) =>
        applyWidgetConfigUpdate(current, settingsWidget.widgetInstanceId, config),
      );

      await loadDisplayLayout(false);
      setSettingsWidgetId(null);
    } catch (err) {
      console.error(err);
      setWidgetConfigError(toErrorMessage(err, "Failed to save widget settings"));
    } finally {
      setSavingWidgetConfig(false);
    }
  }, [loadDisplayLayout, settingsWidget]);

  const frameModel = getDisplayFrameModel(undefined);
  const hasWidgets = renderedWidgets.length > 0;
  const hasAnyDashboardWidgets = hasWidgets || Boolean(outgoingWidgets?.length);
  const showEditControls = shouldShowDisplayEditControls(editMode);

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

    if (!hasAnyDashboardWidgets && error) {
      const model = getDisplayStatusModel("error", error);
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
            onClearWidgetSelection={() => {
              setSelectedWidgetId(null);
            }}
            onWidgetLayoutChange={handleWidgetLayoutChange}
            onOpenWidgetSettings={handleOpenWidgetSettings}
          />
        </Animated.View>
        {outgoingWidgets ? (
          <Animated.View
            pointerEvents="none"
            style={[
              styles.dashboardLayer,
              {
                opacity: dashboardOutgoingOpacity,
              },
            ]}
          >
            <LayoutGrid widgets={outgoingWidgets} />
          </Animated.View>
        ) : null}
        <EditModeHint
          visible={shouldShowEditModeHint(editMode, selectedWidgetId)}
        />
      </View>
    );
  }, [
    dashboardIncomingOpacity,
    dashboardIncomingSlide,
    dashboardOutgoingOpacity,
    editMode,
    error,
    handleWidgetLayoutChange,
    hasAnyDashboardWidgets,
    hasWidgets,
    loadingLayout,
    outgoingWidgets,
    renderedWidgets,
    selectedWidgetId,
  ]);

  return (
    <View style={styles.screen}>
      {onExitDisplayMode ? (
        <View style={styles.exitButtonContainer}>
          <Pressable
            accessibilityRole="button"
            style={styles.exitButton}
            onPress={onExitDisplayMode}
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
        <View style={styles.editModeButtonContainer}>
          <WidgetSurface mode="edit" style={styles.sharedSessionPanel}>
            <WidgetHeader mode="edit" icon="grid" title="Shared Session" />
            <View style={styles.sharedSessionRow}>
              <Text style={styles.sharedSessionLabel}>
                {isSharedMode
                  ? `Shared: ${sharedSession.name}`
                  : "Shared session: off"}
              </Text>
              <Pressable
                accessibilityRole="button"
                style={styles.sharedSessionRefreshButton}
                onPress={() => {
                  void refreshSharedSessions();
                }}
              >
                <Text style={styles.sharedSessionRefreshLabel}>Refresh</Text>
              </Pressable>
              {isSharedMode ? (
                <Pressable
                  accessibilityRole="button"
                  style={styles.sharedSessionLeaveButton}
                  onPress={() => {
                    void leaveCurrentSession();
                  }}
                >
                  <Text style={styles.sharedSessionLeaveLabel}>Leave</Text>
                </Pressable>
              ) : null}
            </View>
            {!isSharedMode ? (
              <View style={styles.sharedSessionRow}>
                <AppTextInput
                  value={newSharedSessionName}
                  onChangeText={setNewSharedSessionName}
                  inputStyle={styles.sharedSessionNameInput}
                  placeholder="Session name"
                  placeholderTextColor="#6b6b6b"
                />
                <Pressable
                  accessibilityRole="button"
                  style={styles.sharedSessionCreateButton}
                  onPress={() => {
                    void createAndJoinSession(newSharedSessionName);
                  }}
                >
                  <Text style={styles.sharedSessionCreateLabel}>Create & Join</Text>
                </Pressable>
              </View>
            ) : null}
            <View style={styles.sharedSessionSessionsRow}>
              {availableSessions.map((session) => {
                const selected = session.id === sharedSession?.id;
                return (
                  <Pressable
                    key={session.id}
                    accessibilityRole="button"
                    style={[styles.sharedSessionChip, selected ? styles.sharedSessionChipActive : null]}
                    onPress={() => {
                      void joinSessionById(session.id);
                    }}
                  >
                    <Text style={styles.sharedSessionChipLabel}>
                      {session.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <Text style={styles.sharedSessionMeta}>
              Connection: {sharedSessionConnectionState}
              {loadingSharedSessions || loadingSharedSessionState ? " • syncing..." : ""}
            </Text>
          </WidgetSurface>
          <View style={styles.profileTabsRow}>
            {profiles.map((profile) => {
              const selected = profile.id === effectiveActiveProfileId;
              return (
                <Pressable
                  key={profile.id}
                  accessibilityRole="button"
                  style={[styles.profileTab, selected ? styles.profileTabSelected : null]}
                  onPress={() => {
                    if (isSharedMode) {
                      void patchCurrentSession({
                        activeProfileId: profile.id,
                      });
                      return;
                    }

                    void setActiveProfile(profile.id);
                  }}
                >
                  <Text style={[styles.profileTabLabel, selected ? styles.profileTabLabelSelected : null]}>
                    {profile.name}
                  </Text>
                </Pressable>
              );
            })}
          </View>
          <WidgetSurface mode="edit" style={styles.slideshowPanel}>
            <WidgetHeader mode="edit" icon="refresh" title="Slideshow" />
            <View style={styles.slideshowRow}>
              <Text style={styles.slideshowLabel}>Enabled</Text>
              <Switch
                value={slideshowEnabled}
                onValueChange={setSlideshowEnabled}
                disabled={profiles.length < 2}
              />
            </View>
            <View style={styles.slideshowProfileRow}>
              {profiles.map((profile) => {
                const selected = slideshowProfileIds.includes(profile.id);
                return (
                  <Pressable
                    key={`${profile.id}-slideshow`}
                    accessibilityRole="button"
                    style={[styles.slideshowProfileChip, selected ? styles.slideshowProfileChipSelected : null]}
                    onPress={() => {
                      toggleSlideshowProfileId(profile.id);
                    }}
                  >
                    <Text style={[styles.slideshowProfileChipLabel, selected ? styles.slideshowProfileChipLabelSelected : null]}>
                      {profile.name}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
            <View style={styles.slideshowRow}>
              <Text style={styles.slideshowLabel}>Interval (s)</Text>
              <AppTextInput
                value={slideshowIntervalSecInput}
                onChangeText={setSlideshowIntervalSecInput}
                keyboardType="numeric"
                inputStyle={styles.slideshowIntervalInput}
                placeholder="60"
                placeholderTextColor="#6b6b6b"
              />
              <Pressable
                accessibilityRole="button"
                style={[styles.slideshowSaveButton, savingSlideshow ? styles.slideshowSaveButtonDisabled : null]}
                onPress={handleSaveSlideshow}
                disabled={savingSlideshow}
              >
                <Text style={styles.slideshowSaveButtonLabel}>{savingSlideshow ? "Saving..." : "Save"}</Text>
              </Pressable>
            </View>
            {slideshowSaveError ? <Text style={styles.slideshowError}>{slideshowSaveError}</Text> : null}
          </WidgetSurface>
          <Pressable
            accessibilityRole="button"
            style={[styles.editModeButton, editMode ? styles.editModeButtonActive : null]}
            onPress={handleToggleEditMode}
          >
            <Text style={styles.editModeButtonLabel}>{editMode ? "Done Editing" : "Edit Layout"}</Text>
          </Pressable>
        </View>
      ) : null}
      {showEditControls ? (
        <View style={styles.layoutActionsContainer}>
          <Pressable
            accessibilityRole="button"
            style={[styles.layoutActionButton, styles.layoutCancelButton]}
            onPress={handleCancelLayout}
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
            onPress={handleSaveLayout}
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
    backgroundColor: "#000",
  },
  exitButtonContainer: {
    position: "absolute",
    top: 18,
    right: 18,
    zIndex: 20,
  },
  exitButton: {
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(0, 0, 0, 0.86)",
  },
  exitButtonLabel: {
    color: "#d8d8d8",
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 24,
  },
  hiddenEditTrigger: {
    position: "absolute",
    left: 12,
    top: 12,
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
    paddingHorizontal: 24,
    paddingVertical: 26,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    color: "#8d8d8d",
    fontSize: 13,
    letterSpacing: 0.4,
  },
  profileTabsRow: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  profileTab: {
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
  },
  profileTabSelected: {
    borderColor: "#fff",
    backgroundColor: "rgba(30, 30, 30, 0.95)",
  },
  profileTabLabel: {
    color: "#bfbfbf",
    fontSize: 11,
    fontWeight: "600",
  },
  profileTabLabelSelected: {
    color: "#fff",
  },
  profileError: {
    position: "absolute",
    bottom: 10,
    left: 18,
    right: 18,
    color: "#ff7d7d",
    fontSize: 12,
    textAlign: "center",
  },
  editModeButtonContainer: {
    position: "absolute",
    top: 18,
    right: 130,
    zIndex: 20,
  },
  sharedSessionPanel: {
    borderColor: "#2f2f2f",
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    minWidth: 360,
    marginBottom: 8,
    gap: 8,
  },
  sharedSessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  sharedSessionLabel: {
    color: "#d8d8d8",
    fontSize: 12,
    fontWeight: "600",
    flex: 1,
  },
  sharedSessionRefreshButton: {
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sharedSessionRefreshLabel: {
    color: "#c6c6c6",
    fontSize: 11,
    fontWeight: "600",
  },
  sharedSessionLeaveButton: {
    borderWidth: 1,
    borderColor: "#8f4f4f",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(57, 16, 16, 0.92)",
  },
  sharedSessionLeaveLabel: {
    color: "#ffd2d2",
    fontSize: 11,
    fontWeight: "700",
  },
  sharedSessionNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: "rgba(9, 9, 9, 0.9)",
  },
  sharedSessionCreateButton: {
    borderWidth: 1,
    borderColor: "#4f8cc0",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(12, 42, 66, 0.92)",
  },
  sharedSessionCreateLabel: {
    color: "#cae8ff",
    fontSize: 11,
    fontWeight: "700",
  },
  sharedSessionSessionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  sharedSessionChip: {
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sharedSessionChipActive: {
    borderColor: "#5DAEFF",
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  sharedSessionChipLabel: {
    color: "#bfbfbf",
    fontSize: 11,
    fontWeight: "600",
  },
  sharedSessionMeta: {
    color: "#979797",
    fontSize: 11,
  },
  editModeButton: {
    marginTop: 8,
    borderWidth: 1,
    borderColor: "#356084",
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(12, 30, 45, 0.9)",
  },
  editModeButtonActive: {
    borderColor: "#5DAEFF",
    backgroundColor: "rgba(20, 52, 82, 0.95)",
  },
  editModeButtonLabel: {
    color: "#b8ddff",
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  layoutActionsContainer: {
    position: "absolute",
    top: 18,
    left: 20,
    zIndex: 20,
    flexDirection: "row",
    gap: 10,
  },
  layoutActionButton: {
    borderWidth: 1,
    borderRadius: 999,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  layoutCancelButton: {
    borderColor: "#575757",
    backgroundColor: "rgba(0, 0, 0, 0.8)",
  },
  layoutSaveButton: {
    borderColor: "#5DAEFF",
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  layoutActionDisabled: {
    opacity: 0.45,
  },
  layoutActionLabel: {
    color: "#e4f2ff",
    fontSize: 12,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
  slideshowPanel: {
    borderColor: "#2f2f2f",
    borderRadius: 14,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    minWidth: 360,
  },
  slideshowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: 8,
  },
  slideshowLabel: {
    color: "#d1d1d1",
    fontSize: 12,
    fontWeight: "600",
  },
  slideshowProfileRow: {
    flexDirection: "row",
    gap: 8,
    flexWrap: "wrap",
    marginBottom: 8,
  },
  slideshowProfileChip: {
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 999,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  slideshowProfileChipSelected: {
    borderColor: "#5DAEFF",
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  slideshowProfileChipLabel: {
    color: "#bfbfbf",
    fontSize: 11,
    fontWeight: "600",
  },
  slideshowProfileChipLabelSelected: {
    color: "#d9ecff",
  },
  slideshowIntervalInput: {
    width: 90,
    borderWidth: 1,
    borderColor: "#3c3c3c",
    borderRadius: 8,
    color: "#fff",
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 12,
    backgroundColor: "rgba(9, 9, 9, 0.9)",
  },
  slideshowSaveButton: {
    borderWidth: 1,
    borderColor: "#5DAEFF",
    borderRadius: 999,
    paddingHorizontal: 12,
    paddingVertical: 7,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  slideshowSaveButtonDisabled: {
    opacity: 0.6,
  },
  slideshowSaveButtonLabel: {
    color: "#d9ecff",
    fontSize: 11,
    fontWeight: "700",
  },
  slideshowError: {
    color: "#ff7d7d",
    fontSize: 11,
  },
});

function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}

function buildLayoutsByWidgetId(
  widgets: DisplayLayoutWidgetEnvelope[],
): Record<string, WidgetLayout> {
  return widgets.reduce<Record<string, WidgetLayout>>((accumulator, widget) => {
    accumulator[widget.widgetInstanceId] = widget.layout;
    return accumulator;
  }, {});
}

function withNormalizedLayouts(
  widgets: DisplayLayoutWidgetEnvelope[],
): DisplayLayoutWidgetEnvelope[] {
  const orderedWidgetIds = widgets.map((widget) => widget.widgetInstanceId);
  const normalizedLayoutsByWidgetId = normalizeWidgetLayouts({
    layoutsById: buildLayoutsByWidgetId(widgets),
    orderedWidgetIds,
  });

  return widgets.map((widget) => ({
    ...widget,
    layout: normalizedLayoutsByWidgetId[widget.widgetInstanceId] ?? widget.layout,
  }));
}
