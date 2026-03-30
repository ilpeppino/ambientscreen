import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme";

interface WidgetSurfaceProps {
  children?: React.ReactNode;
  isSelected?: boolean;
  mode?: "display" | "edit" | "fullscreen";
  style?: StyleProp<ViewStyle>;
}

const DEBUG_WIDGET_BOUNDS = process.env.EXPO_PUBLIC_DEBUG_WIDGET_BOUNDS === "1";

export function WidgetSurface({
  children,
  isSelected = false,
  mode = "display",
  style,
}: WidgetSurfaceProps) {
  const isFullscreen = mode === "fullscreen";
  const surfaceBaseStyle = isFullscreen ? styles.surfaceBaseFullscreen : styles.surface;
  const surfaceModeStyle = mode === "edit" ? styles.surfaceEdit
    : mode === "fullscreen" ? null
    : styles.surfaceDisplay;

  return (
    <View
      style={[
        surfaceBaseStyle,
        surfaceModeStyle,
        !isFullscreen && isSelected ? styles.surfaceSelected : null,
        DEBUG_WIDGET_BOUNDS ? styles.debugSurface : null,
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    borderRadius: radius.lg,
    padding: spacing.xl,
    overflow: "hidden",
  },
  surfaceBaseFullscreen: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    overflow: "hidden",
  },
  surfaceDisplay: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  surfaceEdit: {
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.22)",
    backgroundColor: "rgba(0, 0, 0, 0.72)",
  },
  surfaceSelected: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245, 166, 35, 0.08)",
    boxShadow: `0px 0px 10px ${colors.accent}`,
    elevation: 6,
  },
  debugSurface: {
    borderColor: colors.statusSuccessText,
    borderWidth: 1,
  },
});
