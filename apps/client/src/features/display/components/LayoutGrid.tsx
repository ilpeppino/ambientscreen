import React, { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, StyleSheet, useWindowDimensions, View } from "react-native";
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
import { GridOverlay } from "./GridOverlay";
import { shouldShowGridOverlay } from "./editMode.logic";
import { useDevSettings } from "../../../core/devSettings/devSettings.context";
import { WidgetContainer } from "./WidgetContainer";

interface LayoutGridProps {
  widgets: DisplayLayoutWidgetEnvelope[];
  editMode?: boolean;
  selectedWidgetId?: string | null;
  onSelectWidget?: (widgetId: string) => void;
  onClearWidgetSelection?: () => void;
  onWidgetLayoutChange?: (widgetId: string, layout: WidgetLayout) => void;
  onOpenWidgetSettings?: (widgetId: string) => void;
  onRemoveWidget?: (widgetId: string) => void;
}

interface RenderableWidgetEntry {
  renderKey: string;
  widget: DisplayLayoutWidgetEnvelope;
}

interface PositionedWidget {
  widgetEntry: AnimatedItem<RenderableWidgetEntry>;
  frameStyle: ViewStyle;
}

function toRenderableWidgetEntries(widgets: DisplayLayoutWidgetEnvelope[]): RenderableWidgetEntry[] {
  const duplicateCountByWidgetId = new Map<string, number>();

  return widgets.map((widget) => {
    const occurrence = duplicateCountByWidgetId.get(widget.widgetInstanceId) ?? 0;
    duplicateCountByWidgetId.set(widget.widgetInstanceId, occurrence + 1);

    return {
      renderKey: occurrence === 0
        ? widget.widgetInstanceId
        : `${widget.widgetInstanceId}__duplicate_${occurrence}`,
      widget,
    };
  });
}

export function LayoutGrid({
  widgets,
  editMode = false,
  selectedWidgetId = null,
  onSelectWidget,
  onClearWidgetSelection,
  onWidgetLayoutChange,
  onOpenWidgetSettings,
  onRemoveWidget,
}: LayoutGridProps) {
  const windowDimensions = useWindowDimensions();
  const { settings: devSettings } = useDevSettings();
  const [containerSize, setContainerSize] = useState({
    width: windowDimensions.width,
    height: windowDimensions.height,
  });
  const [animatedWidgetEntries, setAnimatedWidgetEntries] = useState<AnimatedItem<RenderableWidgetEntry>[]>(
    () => {
      const initialEntries = toRenderableWidgetEntries(widgets);
      return initialEntries.map((entry) => ({
        key: entry.renderKey,
        item: entry,
        phase: "stable",
      }));
    },
  );
  const settleTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nextEntries = toRenderableWidgetEntries(widgets);
    if (editMode) {
      setAnimatedWidgetEntries(nextEntries.map((entry) => ({
        key: entry.renderKey,
        item: entry,
        phase: "stable",
      })));
      return;
    }

    setAnimatedWidgetEntries((previous) => reconcileAnimatedItems(
      previous,
      nextEntries,
      (entry) => entry.renderKey,
    ));
  }, [editMode, widgets]);

  useEffect(() => {
    const hasTransitioningWidgets = animatedWidgetEntries.some((entry) => entry.phase !== "stable");
    if (hasTransitioningWidgets === false) {
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
        layout: entry.item.widget.layout,
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
      {editMode ? (
        <Pressable
          accessibilityRole="button"
          style={styles.backgroundSelectionLayer}
          onPress={onClearWidgetSelection}
        />
      ) : null}
      {positionedWidgets.map(({ widgetEntry, frameStyle }) => (
        <WidgetContainer
          key={widgetEntry.key}
          widget={widgetEntry.item.widget}
          frameStyle={frameStyle}
          animationPhase={widgetEntry.phase}
          editMode={editMode}
          hasSelectedWidget={selectedWidgetId !== null}
          isSelected={widgetEntry.item.widget.widgetInstanceId === selectedWidgetId}
          containerSize={containerSize}
          onSelectWidget={onSelectWidget}
          onWidgetLayoutChange={onWidgetLayoutChange}
          onOpenWidgetSettings={onOpenWidgetSettings}
          onRemoveWidget={onRemoveWidget}
        />
      ))}
      <GridOverlay
        visible={
          __DEV__ && editMode && devSettings.debugOverlayEnabled
            ? devSettings.showGridLines
            : shouldShowGridOverlay(editMode)
        }
        columns={DISPLAY_GRID_COLUMNS}
        rows={DISPLAY_GRID_BASE_ROWS}
        lineColor={
          __DEV__ && editMode && devSettings.debugOverlayEnabled && devSettings.showGridLines
            ? "#a78bfa"
            : undefined
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "relative",
  },
  backgroundSelectionLayer: {
    ...StyleSheet.absoluteFillObject,
  },
});
