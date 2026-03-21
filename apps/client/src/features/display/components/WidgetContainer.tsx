import React, { memo, useEffect, useMemo, useRef, useState } from "react";
import { ActivityIndicator, PanResponder, Pressable, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import { renderWidgetFromKey } from "../../../widgets/widget.registry";
import { computeWidgetScale, getWidgetErrorLabel } from "./WidgetContainer.logic";
import {
  applyDragDelta,
  applyResizeDelta,
  DISPLAY_GRID_BASE_ROWS,
  DISPLAY_GRID_COLUMNS,
  type WidgetLayout,
} from "./LayoutGrid.logic";

interface WidgetContainerProps {
  widget: DisplayLayoutWidgetEnvelope;
  frameStyle: StyleProp<ViewStyle>;
  editMode?: boolean;
  isSelected?: boolean;
  containerSize?: { width: number; height: number };
  onSelectWidget?: (widgetId: string) => void;
  onWidgetLayoutChange?: (widgetId: string, layout: WidgetLayout) => void;
}

function WidgetContainerBase({
  widget,
  frameStyle,
  editMode = false,
  isSelected = false,
  containerSize = { width: 0, height: 0 },
  onSelectWidget,
  onWidgetLayoutChange,
}: WidgetContainerProps) {
  const frame = frameStyle as ViewStyle;
  const width = typeof frame.width === "number" ? frame.width : 0;
  const height = typeof frame.height === "number" ? frame.height : 0;
  const scale = computeWidgetScale(width, height);
  const [dragPreview, setDragPreview] = useState({ dx: 0, dy: 0 });
  const [resizePreview, setResizePreview] = useState({ dw: 0, dh: 0 });
  const isResizingRef = useRef(false);

  const layoutRef = useRef(widget.layout);
  useEffect(() => {
    layoutRef.current = widget.layout;
  }, [widget.layout]);

  const columnWidth = containerSize.width > 0 ? containerSize.width / DISPLAY_GRID_COLUMNS : 0;
  const rowHeight = containerSize.height > 0 ? containerSize.height / DISPLAY_GRID_BASE_ROWS : 0;

  const dragResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => editMode && !isResizingRef.current,
    onPanResponderGrant: () => {
      onSelectWidget?.(widget.widgetInstanceId);
      setDragPreview({ dx: 0, dy: 0 });
    },
    onPanResponderMove: (_, gestureState) => {
      if (!editMode || isResizingRef.current) {
        return;
      }

      setDragPreview({
        dx: gestureState.dx,
        dy: gestureState.dy,
      });
    },
    onPanResponderRelease: (_, gestureState) => {
      if (!editMode || isResizingRef.current) {
        return;
      }

      const layout = layoutRef.current;
      const dxCols = columnWidth > 0 ? Math.round(gestureState.dx / columnWidth) : 0;
      const dyRows = rowHeight > 0 ? Math.round(gestureState.dy / rowHeight) : 0;
      const nextLayout = applyDragDelta({
        layout,
        deltaX: dxCols,
        deltaY: dyRows,
      });

      setDragPreview({ dx: 0, dy: 0 });
      onWidgetLayoutChange?.(widget.widgetInstanceId, nextLayout);
    },
    onPanResponderTerminate: () => {
      setDragPreview({ dx: 0, dy: 0 });
    },
  }), [columnWidth, editMode, onSelectWidget, onWidgetLayoutChange, rowHeight, widget.widgetInstanceId]);

  const resizeResponder = useMemo(() => PanResponder.create({
    onMoveShouldSetPanResponder: () => editMode,
    onPanResponderGrant: () => {
      isResizingRef.current = true;
      onSelectWidget?.(widget.widgetInstanceId);
      setResizePreview({ dw: 0, dh: 0 });
    },
    onPanResponderMove: (_, gestureState) => {
      if (!editMode) {
        return;
      }

      setResizePreview({
        dw: gestureState.dx,
        dh: gestureState.dy,
      });
    },
    onPanResponderRelease: (_, gestureState) => {
      if (!editMode) {
        return;
      }

      const layout = layoutRef.current;
      const dwCols = columnWidth > 0 ? Math.round(gestureState.dx / columnWidth) : 0;
      const dhRows = rowHeight > 0 ? Math.round(gestureState.dy / rowHeight) : 0;
      const nextLayout = applyResizeDelta({
        layout,
        deltaX: dwCols,
        deltaY: dhRows,
      });

      isResizingRef.current = false;
      setResizePreview({ dw: 0, dh: 0 });
      onWidgetLayoutChange?.(widget.widgetInstanceId, nextLayout);
    },
    onPanResponderTerminate: () => {
      isResizingRef.current = false;
      setResizePreview({ dw: 0, dh: 0 });
    },
  }), [columnWidth, editMode, onSelectWidget, onWidgetLayoutChange, rowHeight, widget.widgetInstanceId]);

  const previewStyle = useMemo<StyleProp<ViewStyle>>(() => {
    if (!editMode) {
      return null;
    }

    const maxWidthDelta = containerSize.width - width;
    const maxHeightDelta = containerSize.height - height;

    return {
      transform: [{ translateX: dragPreview.dx }, { translateY: dragPreview.dy }],
      width: clampValue(width + resizePreview.dw, 48, Math.max(48, width + maxWidthDelta)),
      height: clampValue(height + resizePreview.dh, 48, Math.max(48, height + maxHeightDelta)),
    };
  }, [containerSize.height, containerSize.width, dragPreview.dx, dragPreview.dy, editMode, height, resizePreview.dh, resizePreview.dw, width]);

  const content = useMemo(() => {
    if (widget.state === "loading") {
      return (
        <View style={styles.centered}>
          <ActivityIndicator size="small" color="#d8d8d8" />
        </View>
      );
    }

    if (widget.state === "error") {
      return (
        <View style={styles.centered}>
          <Text style={styles.errorText}>{getWidgetErrorLabel(widget)}</Text>
        </View>
      );
    }

    if (widget.state === "empty") {
      return (
        <View style={styles.centered}>
          <Text style={styles.emptyText}>No data</Text>
        </View>
      );
    }

    return (
      <View style={styles.readyViewport}>
        <View style={[styles.readyCanvas, { transform: [{ scale }] }]}>
          {renderWidgetFromKey(widget.widgetKey, widget.data)}
        </View>
      </View>
    );
  }, [scale, widget]);

  return (
    <View
      style={[
        styles.container,
        frameStyle,
        previewStyle,
        editMode ? styles.editModeContainer : null,
        editMode && isSelected ? styles.selectedContainer : null,
      ]}
      {...(editMode ? dragResponder.panHandlers : {})}
    >
      <Pressable
        disabled={!editMode}
        style={styles.contentPressArea}
        onPress={() => {
          if (editMode) {
            onSelectWidget?.(widget.widgetInstanceId);
          }
        }}
      >
        {content}
      </Pressable>
      {editMode ? (
        <View style={styles.resizeHandle} {...resizeResponder.panHandlers}>
          <View style={styles.resizeHandleGlyph} />
        </View>
      ) : null}
    </View>
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
    && prevProps.editMode === nextProps.editMode
    && prevProps.isSelected === nextProps.isSelected
    && prevFrame.left === nextFrame.left
    && prevFrame.top === nextFrame.top
    && prevFrame.width === nextFrame.width
    && prevFrame.height === nextFrame.height
  );
});

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    borderRadius: 18,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    overflow: "hidden",
    padding: 12,
  },
  contentPressArea: {
    flex: 1,
  },
  editModeContainer: {
    borderColor: "rgba(93, 174, 255, 0.5)",
    borderStyle: "dashed",
    backgroundColor: "rgba(26, 53, 84, 0.2)",
  },
  selectedContainer: {
    borderColor: "rgba(93, 174, 255, 0.95)",
    shadowColor: "#5DAEFF",
    shadowOpacity: 0.3,
    shadowRadius: 12,
    shadowOffset: {
      width: 0,
      height: 4,
    },
  },
  centered: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  readyViewport: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  readyCanvas: {
    width: 640,
    height: 360,
  },
  errorText: {
    color: "#ff9b9b",
    fontSize: 12,
    textAlign: "center",
  },
  emptyText: {
    color: "#9a9a9a",
    fontSize: 12,
    textAlign: "center",
  },
  resizeHandle: {
    position: "absolute",
    right: 4,
    bottom: 4,
    width: 26,
    height: 26,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: "rgba(93, 174, 255, 0.9)",
    backgroundColor: "rgba(14, 28, 43, 0.95)",
    alignItems: "center",
    justifyContent: "center",
  },
  resizeHandleGlyph: {
    width: 12,
    height: 12,
    borderRightWidth: 2,
    borderBottomWidth: 2,
    borderColor: "#b0d8ff",
  },
});

function clampValue(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}
