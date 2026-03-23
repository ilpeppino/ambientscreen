import { useEffect, useRef, useState } from "react";
import { Animated, Easing } from "react-native";
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
  dashboardIncomingOpacity: Animated.Value;
  dashboardOutgoingOpacity: Animated.Value;
  dashboardIncomingSlide: Animated.Value;
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
  const dashboardTransitionAnimationRef = useRef<Animated.CompositeAnimation | null>(null);
  const dashboardIncomingOpacity = useRef(new Animated.Value(1)).current;
  const dashboardOutgoingOpacity = useRef(new Animated.Value(0)).current;
  const dashboardIncomingSlide = useRef(new Animated.Value(0)).current;

  const markTransitionPending = () => {
    transitionPendingRef.current = true;
  };

  // Cancel animation when app goes background
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

  // Cleanup on unmount
  useEffect(() => () => {
    dashboardTransitionAnimationRef.current?.stop();
    dashboardTransitionAnimationRef.current = null;
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
