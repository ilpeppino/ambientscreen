import { useEffect, useRef, useState } from "react";
import {
  cancelAnimation,
  useSharedValue,
  withTiming,
  type SharedValue,
} from "react-native-reanimated";
import { easing, motion } from "../../../shared/ui/theme";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import {
  createTransitionManager,
  transitionPresets,
  type TransitionType,
} from "../animations/transitionManager";

const DISPLAY_TRANSITION_TYPE: TransitionType = "fade";

interface UseDashboardTransitionOptions {
  layoutWidgets: DisplayLayoutWidgetEnvelope[];
  editMode: boolean;
  isAppActive: boolean;
}

interface UseDashboardTransitionReturn {
  renderedWidgets: DisplayLayoutWidgetEnvelope[];
  outgoingWidgets: DisplayLayoutWidgetEnvelope[] | null;
  dashboardTransitionType: TransitionType;
  dashboardIncomingOpacity: SharedValue<number>;
  dashboardOutgoingOpacity: SharedValue<number>;
  dashboardIncomingSlide: SharedValue<number>;
  markTransitionPending: () => void;
}

export function useDashboardTransition({
  layoutWidgets,
  editMode,
  isAppActive,
}: UseDashboardTransitionOptions): UseDashboardTransitionReturn {
  const [renderedWidgets, setRenderedWidgets] = useState<DisplayLayoutWidgetEnvelope[]>([]);
  const [outgoingWidgets, setOutgoingWidgets] = useState<DisplayLayoutWidgetEnvelope[] | null>(null);
  const [dashboardTransitionType] = useState<TransitionType>(DISPLAY_TRANSITION_TYPE);

  const transitionManagerRef = useRef(createTransitionManager<DisplayLayoutWidgetEnvelope[]>({
    transitionType: DISPLAY_TRANSITION_TYPE,
    initialDashboard: [],
  }));
  const transitionPendingRef = useRef(false);
  const transitionIdRef = useRef<number | null>(null);

  const dashboardIncomingOpacity = useSharedValue(1);
  const dashboardOutgoingOpacity = useSharedValue(0);
  const dashboardIncomingSlide = useSharedValue(0);

  const markTransitionPending = () => {
    transitionPendingRef.current = true;
  };

  function cancelDashboardAnimation() {
    cancelAnimation(dashboardIncomingOpacity);
    cancelAnimation(dashboardOutgoingOpacity);
    cancelAnimation(dashboardIncomingSlide);
    transitionIdRef.current = null;
  }

  // Cancel animation when app goes background
  useEffect(() => {
    if (isAppActive) {
      return;
    }

    transitionPendingRef.current = false;
    cancelDashboardAnimation();
    transitionManagerRef.current.cancelDashboardTransition();
    setOutgoingWidgets(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAppActive]);

  // Run or skip transition when layout changes
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
      cancelDashboardAnimation();
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

    cancelDashboardAnimation();
    const preset = transitionPresets[dashboardTransitionType];
    const duration = preset.durationMs;
    const capturedTransitionId = nextState.transitionId;
    transitionIdRef.current = capturedTransitionId;

    dashboardIncomingOpacity.value = dashboardTransitionType === "fade" ? 0.72 : 0.78;
    dashboardOutgoingOpacity.value = 1;
    dashboardIncomingSlide.value = dashboardTransitionType === "slide" ? 14 : 0;

    dashboardOutgoingOpacity.value = withTiming(0, {
      duration,
      easing: easing.inOut,
    });
    dashboardIncomingOpacity.value = withTiming(1, {
      duration,
      easing: easing.decelerate,
    });
    dashboardIncomingSlide.value = withTiming(0, {
      duration,
      easing: easing.decelerate,
    });

    // Complete the transition after duration
    const timer = setTimeout(() => {
      if (transitionIdRef.current !== capturedTransitionId) {
        return;
      }
      const completedState = transitionManager.completeDashboardTransition(capturedTransitionId);
      setRenderedWidgets(completedState.currentDashboard ?? []);
      setOutgoingWidgets(completedState.previousDashboard);
      transitionIdRef.current = null;
    }, duration + motion.fast);

    return () => {
      clearTimeout(timer);
    };
  }, [
    dashboardIncomingOpacity,
    dashboardIncomingSlide,
    dashboardOutgoingOpacity,
    dashboardTransitionType,
    editMode,
    isAppActive,
    layoutWidgets,
  ]);

  // Cleanup on unmount
  useEffect(() => () => {
    cancelDashboardAnimation();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return {
    renderedWidgets,
    outgoingWidgets,
    dashboardTransitionType,
    dashboardIncomingOpacity,
    dashboardOutgoingOpacity,
    dashboardIncomingSlide,
    markTransitionPending,
  };
}
