import React, { useEffect, useMemo, useRef, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import {
  reconcileAnimatedItems,
  settleAnimatedItems,
  transitionPresets,
  type AnimatedItem,
} from "../animations/transitionManager";
import {
  clampWidgetLayout,
  computeLayoutFrame,
  DISPLAY_GRID_BASE_ROWS,
  DISPLAY_GRID_COLUMNS,
  type WidgetLayout,
} from "./LayoutGrid.logic";
import { WidgetContainer } from "./WidgetContainer";

interface LayoutGridProps {
  widgets: DisplayLayoutWidgetEnvelope[];
  editMode?: boolean;
  selectedWidgetId?: string | null;
  onSelectWidget?: (widgetId: string) => void;
  onWidgetLayoutChange?: (widgetId: string, layout: WidgetLayout) => void;
  onOpenWidgetSettings?: (widgetId: string) => void;
}

interface PositionedWidget {
  widgetEntry: AnimatedItem<DisplayLayoutWidgetEnvelope>;
  frameStyle: ViewStyle;
}

export function LayoutGrid({
  widgets,
  editMode = false,
  selectedWidgetId = null,
  onSelectWidget,
  onWidgetLayoutChange,
  onOpenWidgetSettings,
}: LayoutGridProps) {
  const windowDimensions = useWindowDimensions();
  const [containerSize, setContainerSize] = useState({
    width: windowDimensions.width,
    height: windowDimensions.height,
  });
  const [animatedWidgetEntries, setAnimatedWidgetEntries] = useState<AnimatedItem<DisplayLayoutWidgetEnvelope>[]>(
    () =>
      widgets.map((widget) => ({
        key: widget.widgetInstanceId,
        item: widget,
        phase: "stable",
      })),
  );
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    setAnimatedWidgetEntries((previous) => reconcileAnimatedItems(
      previous,
      widgets,
      (widget) => widget.widgetInstanceId,
    ));
  }, [widgets]);

  useEffect(() => {
    if (!animatedWidgetEntries.some((entry) => entry.phase !== "stable")) {
      return () => undefined;
    }

    if (settleTimeoutRef.current) {
      clearTimeout(settleTimeoutRef.current);
    }

    settleTimeoutRef.current = setTimeout(() => {
      setAnimatedWidgetEntries((previous) => settleAnimatedItems(previous));
    }, transitionPresets.fade.durationMs + 40);

    return () => {
      if (settleTimeoutRef.current) {
        clearTimeout(settleTimeoutRef.current);
        settleTimeoutRef.current = null;
      }
    };
  }, [animatedWidgetEntries]);

  const positionedWidgets = useMemo<PositionedWidget[]>(() => {
    const resolvedLayouts = animatedWidgetEntries.map((entry) =>
      clampWidgetLayout({
        layout: entry.item.layout,
        columns: DISPLAY_GRID_COLUMNS,
        rows: DISPLAY_GRID_BASE_ROWS,
      }),
    );

    return animatedWidgetEntries.map((widgetEntry, index) => {
      const frame = computeLayoutFrame({
        layout: resolvedLayouts[index],
        containerWidth: containerSize.width,
        containerHeight: containerSize.height,
      });

      return {
        widgetEntry,
        frameStyle: {
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
        },
      };
    });
  }, [animatedWidgetEntries, containerSize.height, containerSize.width]);

  function handleLayout(event: LayoutChangeEvent) {
    const { width, height } = event.nativeEvent.layout;
    setContainerSize((previous) => {
      if (previous.width === width && previous.height === height) {
        return previous;
      }

      return {
        width,
        height,
      };
    });
  }

  return (
    <View style={styles.container} onLayout={handleLayout}>
      {positionedWidgets.map(({ widgetEntry, frameStyle }) => (
        <WidgetContainer
          key={widgetEntry.key}
          widget={widgetEntry.item}
          frameStyle={frameStyle}
          animationPhase={widgetEntry.phase}
          editMode={editMode}
          isSelected={widgetEntry.item.widgetInstanceId === selectedWidgetId}
          containerSize={containerSize}
          onSelectWidget={onSelectWidget}
          onWidgetLayoutChange={onWidgetLayoutChange}
          onOpenWidgetSettings={onOpenWidgetSettings}
        />
      ))}
      {editMode ? <GridOverlay /> : null}
    </View>
  );
}

function GridOverlay() {
  return (
    <View pointerEvents="none" style={styles.gridOverlay}>
      {Array.from({ length: DISPLAY_GRID_COLUMNS - 1 }).map((_, index) => (
        <View
          key={`col-${index + 1}`}
          style={[
            styles.verticalGridLine,
            {
              left: `${((index + 1) / DISPLAY_GRID_COLUMNS) * 100}%`,
            },
          ]}
        />
      ))}
      {Array.from({ length: DISPLAY_GRID_BASE_ROWS - 1 }).map((_, index) => (
        <View
          key={`row-${index + 1}`}
          style={[
            styles.horizontalGridLine,
            {
              top: `${((index + 1) / DISPLAY_GRID_BASE_ROWS) * 100}%`,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  gridOverlay: {
    ...StyleSheet.absoluteFillObject,
  },
  verticalGridLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
  horizontalGridLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(255, 255, 255, 0.08)",
  },
});
