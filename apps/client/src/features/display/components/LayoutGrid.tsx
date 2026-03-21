import React, { useMemo, useState } from "react";
import { StyleSheet, useWindowDimensions, View } from "react-native";
import type { LayoutChangeEvent, ViewStyle } from "react-native";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import { computeLayoutFrame, resolveWidgetLayouts } from "./LayoutGrid.logic";
import { WidgetContainer } from "./WidgetContainer";

interface LayoutGridProps {
  widgets: DisplayLayoutWidgetEnvelope[];
}

interface PositionedWidget {
  widget: DisplayLayoutWidgetEnvelope;
  frameStyle: ViewStyle;
}

export function LayoutGrid({ widgets }: LayoutGridProps) {
  const windowDimensions = useWindowDimensions();
  const [containerSize, setContainerSize] = useState({
    width: windowDimensions.width,
    height: windowDimensions.height,
  });

  const positionedWidgets = useMemo<PositionedWidget[]>(() => {
    const resolvedLayouts = resolveWidgetLayouts({
      layouts: widgets.map((widget) => widget.layout),
    });

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
});
