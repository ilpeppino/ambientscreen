import React, { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from "react-native-reanimated";
import { Gesture, GestureDetector } from "react-native-gesture-handler";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import { AppIcon } from "../../../shared/ui/components";
import { Text } from "../../../shared/ui/components/Text";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { colors, motion, radius, shadows, spacing } from "../../../shared/ui/theme";
import { WidgetState } from "../../../shared/ui/widgets";
import { WidgetSkeleton } from "../../../shared/ui/Skeleton";
import type { AnimatedItemPhase } from "../animations/transitionManager";
import { renderWidgetFromKey } from "../../../widgets/pluginRegistry";
import { getWidgetErrorLabel } from "./WidgetContainer.logic";
import {
  applyDragDelta,
  applyResizeDelta,
  DISPLAY_GRID_BASE_ROWS,
  DISPLAY_GRID_COLUMNS,
  type WidgetLayout,
} from "./LayoutGrid.logic";
import { shouldShowWidgetAffordances } from "./editMode.logic";
import { WidgetContextActions } from "./WidgetContextActions";
import { WidgetEditHandles } from "./WidgetEditHandles";

interface WidgetContainerProps {
  widget: DisplayLayoutWidgetEnvelope;
  frameStyle: StyleProp<ViewStyle>;
  animationPhase?: AnimatedItemPhase;
  editMode?: boolean;
  isSelected?: boolean;
  hasSelectedWidget?: boolean;
  containerSize?: { width: number; height: number };
  onSelectWidget?: (widgetId: string) => void;
  onWidgetLayoutChange?: (widgetId: string, layout: WidgetLayout) => void;
  onOpenWidgetSettings?: (widgetId: string) => void;
  onRemoveWidget?: (widgetId: string) => void;
}

const DEBUG_WIDGET_BOUNDS = process.env.EXPO_PUBLIC_DEBUG_WIDGET_BOUNDS === "1";

function clampValue(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(value, max));
}

function WidgetContainerBase({
  widget,
  frameStyle,
  animationPhase = "stable",
  editMode = false,
  isSelected = false,
  hasSelectedWidget = false,
  containerSize = { width: 0, height: 0 },
  onSelectWidget,
  onWidgetLayoutChange,
  onOpenWidgetSettings,
  onRemoveWidget,
}: WidgetContainerProps) {
  const frame = frameStyle as ViewStyle;
  const width = typeof frame.width === "number" ? frame.width : 0;
  const height = typeof frame.height === "number" ? frame.height : 0;
  const left = typeof frame.left === "number" ? frame.left : 0;
  const top = typeof frame.top === "number" ? frame.top : 0;

  const [snapLabel, setSnapLabel] = useState<string | null>(null);

  const layoutRef = useRef(widget.layout);
  useEffect(() => {
    layoutRef.current = widget.layout;
  }, [widget.layout]);

  const mountOpacity = useSharedValue(animationPhase === "enter" ? 0 : 1);
  const mountScale = useSharedValue(animationPhase === "enter" ? 0.98 : 1);
  const dragTranslateX = useSharedValue(0);
  const dragTranslateY = useSharedValue(0);
  const resizePreviewX = useSharedValue(0);
  const resizePreviewY = useSharedValue(0);
  const contentOpacity = useSharedValue(1);

  useEffect(() => {
    if (animationPhase === "exit") {
      mountOpacity.value = withTiming(0, { duration: motion.normal });
      mountScale.value = withTiming(0.98, { duration: motion.normal });
      return;
    }

    if (animationPhase === "enter") {
      mountOpacity.value = 0;
      mountScale.value = 0.98;
    }

    mountOpacity.value = withTiming(1, { duration: motion.normal });
    mountScale.value = withTiming(1, { duration: motion.normal });
  }, [animationPhase, mountOpacity, mountScale]);

  useEffect(() => {
    if (editMode) {
      return;
    }

    dragTranslateX.value = withTiming(0, { duration: motion.fast });
    dragTranslateY.value = withTiming(0, { duration: motion.fast });
    resizePreviewX.value = withTiming(0, { duration: motion.fast });
    resizePreviewY.value = withTiming(0, { duration: motion.fast });
    setSnapLabel(null);
  }, [dragTranslateX, dragTranslateY, editMode, resizePreviewX, resizePreviewY]);

  useEffect(() => {
    if (editMode) {
      contentOpacity.value = 1;
      return;
    }

    contentOpacity.value = 0.82;
    contentOpacity.value = withTiming(1, { duration: motion.normal });
  }, [contentOpacity, editMode, widget.data, widget.meta.fetchedAt, widget.meta.staleAt, widget.state]);

  const columnWidth = containerSize.width > 0 ? containerSize.width / DISPLAY_GRID_COLUMNS : 0;
  const rowHeight = containerSize.height > 0 ? containerSize.height / DISPLAY_GRID_BASE_ROWS : 0;

  const canEditSelectedWidget = shouldShowWidgetAffordances(editMode, isSelected);
  const maxPreviewWidth = Math.max(48, containerSize.width - left);
  const maxPreviewHeight = Math.max(48, containerSize.height - top);

  const animatedContainerStyle = useAnimatedStyle(() => {
    const previewWidth = editMode
      ? clampValue(width + resizePreviewX.value, 48, maxPreviewWidth)
      : width;
    const previewHeight = editMode
      ? clampValue(height + resizePreviewY.value, 48, maxPreviewHeight)
      : height;

    return {
      width: previewWidth,
      height: previewHeight,
      opacity: mountOpacity.value,
      transform: [
        { translateX: dragTranslateX.value },
        { translateY: dragTranslateY.value },
        { scale: mountScale.value },
      ],
    };
  }, [editMode, height, maxPreviewHeight, maxPreviewWidth, mountOpacity, mountScale, resizePreviewX, resizePreviewY, width, dragTranslateX, dragTranslateY]);

  const animatedContentStyle = useAnimatedStyle(() => ({
    opacity: contentOpacity.value,
  }), [contentOpacity]);

  const commitDragLayout = useCallback((translationX: number, translationY: number) => {
    if (columnWidth <= 0 || rowHeight <= 0) {
      return;
    }

    const nextLayout = applyDragDelta({
      layout: layoutRef.current,
      deltaX: Math.round(translationX / columnWidth),
      deltaY: Math.round(translationY / rowHeight),
    });

    onWidgetLayoutChange?.(widget.widgetInstanceId, nextLayout);
  }, [columnWidth, onWidgetLayoutChange, rowHeight, widget.widgetInstanceId]);

  const commitResizeLayout = useCallback((translationX: number, translationY: number) => {
    if (columnWidth <= 0 || rowHeight <= 0) {
      return;
    }

    const nextLayout = applyResizeDelta({
      layout: layoutRef.current,
      deltaX: Math.round(translationX / columnWidth),
      deltaY: Math.round(translationY / rowHeight),
    });

    onWidgetLayoutChange?.(widget.widgetInstanceId, nextLayout);
  }, [columnWidth, onWidgetLayoutChange, rowHeight, widget.widgetInstanceId]);

  const updateDragSnap = useCallback((translationX: number, translationY: number) => {
    if (columnWidth <= 0 || rowHeight <= 0) {
      setSnapLabel(null);
      return;
    }

    const deltaX = Math.round(translationX / columnWidth);
    const deltaY = Math.round(translationY / rowHeight);
    setSnapLabel(`Move ${deltaX >= 0 ? "+" : ""}${deltaX} col, ${deltaY >= 0 ? "+" : ""}${deltaY} row`);
  }, [columnWidth, rowHeight]);

  const updateResizeSnap = useCallback((translationX: number, translationY: number) => {
    if (columnWidth <= 0 || rowHeight <= 0) {
      setSnapLabel(null);
      return;
    }

    const deltaW = Math.round(translationX / columnWidth);
    const deltaH = Math.round(translationY / rowHeight);
    setSnapLabel(`Resize ${deltaW >= 0 ? "+" : ""}${deltaW} col, ${deltaH >= 0 ? "+" : ""}${deltaH} row`);
  }, [columnWidth, rowHeight]);

  const clearPreview = useCallback(() => {
    setSnapLabel(null);
  }, []);

  const dragGesture = useMemo(() => Gesture.Pan()
    .enabled(canEditSelectedWidget)
    .onBegin(() => {
      if (onSelectWidget) {
        runOnJS(onSelectWidget)(widget.widgetInstanceId);
      }
    })
    .onUpdate((event) => {
      dragTranslateX.value = event.translationX;
      dragTranslateY.value = event.translationY;
      runOnJS(updateDragSnap)(event.translationX, event.translationY);
    })
    .onEnd((event) => {
      runOnJS(commitDragLayout)(event.translationX, event.translationY);
      dragTranslateX.value = withTiming(0, { duration: motion.fast });
      dragTranslateY.value = withTiming(0, { duration: motion.fast });
      runOnJS(clearPreview)();
    })
    .onFinalize(() => {
      dragTranslateX.value = withTiming(0, { duration: motion.fast });
      dragTranslateY.value = withTiming(0, { duration: motion.fast });
      runOnJS(clearPreview)();
    }),
  [canEditSelectedWidget, onSelectWidget, widget.widgetInstanceId, dragTranslateX, dragTranslateY, updateDragSnap, commitDragLayout, clearPreview]);

  const resizeGesture = useMemo(() => Gesture.Pan()
    .enabled(canEditSelectedWidget)
    .onBegin(() => {
      if (onSelectWidget) {
        runOnJS(onSelectWidget)(widget.widgetInstanceId);
      }
    })
    .onUpdate((event) => {
      resizePreviewX.value = event.translationX;
      resizePreviewY.value = event.translationY;
      runOnJS(updateResizeSnap)(event.translationX, event.translationY);
    })
    .onEnd((event) => {
      runOnJS(commitResizeLayout)(event.translationX, event.translationY);
      resizePreviewX.value = withTiming(0, { duration: motion.fast });
      resizePreviewY.value = withTiming(0, { duration: motion.fast });
      runOnJS(clearPreview)();
    })
    .onFinalize(() => {
      resizePreviewX.value = withTiming(0, { duration: motion.fast });
      resizePreviewY.value = withTiming(0, { duration: motion.fast });
      runOnJS(clearPreview)();
    }),
  [canEditSelectedWidget, onSelectWidget, widget.widgetInstanceId, resizePreviewX, resizePreviewY, updateResizeSnap, commitResizeLayout, clearPreview]);

  const content = useMemo(() => {
    if (widget.state === "loading") {
      return <WidgetSkeleton />;
    }

    if (widget.state === "error") {
      return (
        <View style={styles.centered}>
          <ErrorState compact message={getWidgetErrorLabel(widget)} />
        </View>
      );
    }

    const rendered = renderWidgetFromKey(widget.widgetKey, {
      widgetInstanceId: widget.widgetInstanceId,
      state: widget.state,
      data: widget.data,
      config: widget.config,
      meta: widget.meta,
    });

    if (!rendered) {
      return (
        <View style={styles.centered}>
          {widget.state === "empty" ? (
            <WidgetState type="empty" compact message="No data available" />
          ) : (
            <Text variant="caption" color="textSecondary">
              Unsupported widget plugin
            </Text>
          )}
        </View>
      );
    }

    return (
      <View style={styles.readyViewport}>
        {rendered}
      </View>
    );
  }, [widget]);

  const AnimatedView = Animated.View as unknown as React.ComponentType<any>;

  return (
    <GestureDetector gesture={dragGesture}>
      <AnimatedView
        style={[
          styles.container,
          DEBUG_WIDGET_BOUNDS ? styles.debugOuterContainer : null,
          frameStyle,
          animatedContainerStyle,
          editMode ? styles.editModeContainer : null,
          canEditSelectedWidget ? styles.selectedContainer : null,
          editMode && hasSelectedWidget && isSelected === false ? styles.secondaryInEditMode : null,
        ] as any}
      >
        <AnimatedView style={[styles.contentLayer, animatedContentStyle]}>
          <Pressable
            accessibilityRole={editMode ? "button" : undefined}
            disabled={editMode === false}
            style={[styles.contentPressArea, DEBUG_WIDGET_BOUNDS ? styles.debugPressArea : null]}
            onPress={() => {
              if (editMode && onSelectWidget) {
                onSelectWidget(widget.widgetInstanceId);
              }
            }}
          >
            {content}
          </Pressable>
        </AnimatedView>

        <WidgetContextActions
          visible={canEditSelectedWidget}
          onSettings={
            onOpenWidgetSettings
              ? () => onOpenWidgetSettings(widget.widgetInstanceId)
              : undefined
          }
          onRemove={
            onRemoveWidget
              ? () => onRemoveWidget(widget.widgetInstanceId)
              : undefined
          }
        />

        <WidgetEditHandles visible={canEditSelectedWidget} snapLabel={snapLabel}>
          <GestureDetector gesture={resizeGesture}>
            <View style={styles.resizeHandle}>
              <AppIcon name="plus" size="sm" color="textPrimary" />
            </View>
          </GestureDetector>
        </WidgetEditHandles>
      </AnimatedView>
    </GestureDetector>
  );
}

export const WidgetContainer = memo(WidgetContainerBase, (prevProps, nextProps) => {
  const prevFrame = prevProps.frameStyle as ViewStyle;
  const nextFrame = nextProps.frameStyle as ViewStyle;

  return (
    prevProps.widget.widgetInstanceId === nextProps.widget.widgetInstanceId
    && prevProps.widget.widgetKey === nextProps.widget.widgetKey
    && prevProps.widget.state === nextProps.widget.state
    && prevProps.widget.data === nextProps.widget.data
    && prevProps.widget.layout.x === nextProps.widget.layout.x
    && prevProps.widget.layout.y === nextProps.widget.layout.y
    && prevProps.widget.layout.w === nextProps.widget.layout.w
    && prevProps.widget.layout.h === nextProps.widget.layout.h
    && prevProps.animationPhase === nextProps.animationPhase
    && prevProps.editMode === nextProps.editMode
    && prevProps.isSelected === nextProps.isSelected
    && prevProps.hasSelectedWidget === nextProps.hasSelectedWidget
    && prevFrame.left === nextFrame.left
    && prevFrame.top === nextFrame.top
    && prevFrame.width === nextFrame.width
    && prevFrame.height === nextFrame.height
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    overflow: "hidden",
    padding: spacing.md,
  },
  contentPressArea: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  contentLayer: {
    flex: 1,
    minHeight: 0,
    overflow: "hidden",
  },
  debugOuterContainer: {
    borderColor: colors.statusDangerText,
    borderWidth: 1,
  },
  debugPressArea: {
    borderColor: colors.statusInfoText,
    borderWidth: 1,
  },
  editModeContainer: {
    borderColor: `${colors.textSecondary}CC`,
    backgroundColor: `${colors.surface}B3`,
  },
  selectedContainer: {
    borderColor: `${colors.accent}EE`,
    ...shadows.selected,
  },
  secondaryInEditMode: {
    opacity: 0.72,
  },
  centered: {
    flex: 1,
    minHeight: 0,
    alignItems: "center",
    justifyContent: "center",
  },
  readyViewport: {
    flex: 1,
    minHeight: 0,
  },
  resizeHandle: {
    position: "absolute",
    right: spacing.sm,
    bottom: spacing.sm,
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    borderColor: `${colors.accent}AA`,
    borderRadius: radius.sm,
    backgroundColor: `${colors.backgroundPrimary}CC`,
  },
});
