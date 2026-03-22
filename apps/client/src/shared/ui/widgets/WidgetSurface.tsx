import React from "react";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { colors, radius, spacing } from "../theme";

interface WidgetSurfaceProps {
  children?: React.ReactNode;
  isSelected?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function WidgetSurface({
  children,
  isSelected = false,
  style,
}: WidgetSurfaceProps) {
  return (
    <View style={[styles.surface, isSelected ? styles.surfaceSelected : null, style]}>
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  surface: {
    width: "100%",
    borderWidth: 1,
    borderColor: colors.surface,
    borderRadius: radius.lg,
    backgroundColor: "rgba(255, 255, 255, 0.04)",
    padding: spacing.xl,
  },
  surfaceSelected: {
    borderColor: colors.accent,
    backgroundColor: "rgba(245, 166, 35, 0.08)",
  },
});
