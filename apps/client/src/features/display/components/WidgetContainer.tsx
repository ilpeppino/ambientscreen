import React, { memo, useMemo } from "react";
import { ActivityIndicator, StyleSheet, Text, View } from "react-native";
import type { StyleProp, ViewStyle } from "react-native";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import { renderWidgetFromKey } from "../../../widgets/widget.registry";
import { computeWidgetScale, getWidgetErrorLabel } from "./WidgetContainer.logic";

interface WidgetContainerProps {
  widget: DisplayLayoutWidgetEnvelope;
  frameStyle: StyleProp<ViewStyle>;
}

function WidgetContainerBase({ widget, frameStyle }: WidgetContainerProps) {
  const frame = frameStyle as ViewStyle;
  const width = typeof frame.width === "number" ? frame.width : 0;
  const height = typeof frame.height === "number" ? frame.height : 0;
  const scale = computeWidgetScale(width, height);

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

  return <View style={[styles.container, frameStyle]}>{content}</View>;
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
});
