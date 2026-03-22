import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme";

interface WidgetSurfaceProps {
  children?: React.ReactNode;
  isSelected?: boolean;
  mode?: "display" | "edit";
  style?: StyleProp<ViewStyle>;
}

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
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    width: "100%",
    borderRadius: radius.lg,
    padding: spacing.xl,
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
  },
});
