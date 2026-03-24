import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme";

interface WidgetSurfaceProps {
  children?: React.ReactNode;
  isSelected?: boolean;
  mode?: "display" | "edit";
  style?: StyleProp<ViewStyle>;
}

const DEBUG_WIDGET_BOUNDS = process.env.EXPO_PUBLIC_DEBUG_WIDGET_BOUNDS === "1";

export function WidgetSurface({
  children,
  isSelected = false,
  mode = "display",
  style,
}: WidgetSurfaceProps) {
  const surfaceModeStyle = mode === "edit" ? styles.surfaceEdit : styles.surfaceDisplay;

  return (
    <View
      style={[
        styles.surface,
        surfaceModeStyle,
        isSelected ? styles.surfaceSelected : null,
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
    shadowColor: colors.accent,
    shadowOpacity: 0.3,
    shadowRadius: 10,
    shadowOffset: {
      width: 0,
      height: 0,
    },
    elevation: 6,
  },
  debugSurface: {
    borderColor: colors.statusSuccessText,
    borderWidth: 1,
  },
});
