import React, { useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
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
  widget: DisplayLayoutWidgetEnvelope;
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

  const positionedWidgets = useMemo<PositionedWidget[]>(() => {
    const resolvedLayouts = widgets.map((widget) =>
      clampWidgetLayout({
        layout: widget.layout,
        columns: DISPLAY_GRID_COLUMNS,
        rows: DISPLAY_GRID_BASE_ROWS,
      }),
    );

    return widgets.map((widget, index) => {
      const frame = computeLayoutFrame({
        layout: resolvedLayouts[index],
        containerWidth: containerSize.width,
        containerHeight: containerSize.height,
      });

      return {
        widget,
        frameStyle: {
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
        },
      };
    });
  }, [containerSize.height, containerSize.width, widgets]);

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
      {positionedWidgets.map(({ widget, frameStyle }) => (
        <WidgetContainer
          key={widget.widgetInstanceId}
          widget={widget}
          frameStyle={frameStyle}
          editMode={editMode}
          isSelected={widget.widgetInstanceId === selectedWidgetId}
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
