import React from "react";
import { StyleSheet, View } from "react-native";
import { colors } from "../../../shared/ui/theme";

interface GridOverlayProps {
  visible: boolean;
  columns: number;
  rows: number;
}

export function GridOverlay({ visible, columns, rows }: GridOverlayProps) {
  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.overlay}>
      {Array.from({ length: Math.max(0, columns - 1) }).map((_, index) => (
        <View
          key={`col-${index + 1}`}
          style={[
            styles.verticalLine,
            {
              left: `${((index + 1) / columns) * 100}%`,
            },
          ]}
        />
      ))}
      {Array.from({ length: Math.max(0, rows - 1) }).map((_, index) => (
        <View
          key={`row-${index + 1}`}
          style={[
            styles.horizontalLine,
            {
              top: `${((index + 1) / rows) * 100}%`,
            },
          ]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255, 255, 255, 0.01)",
  },
  verticalLine: {
    position: "absolute",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: `${colors.textSecondary}66`,
  },
  horizontalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: `${colors.textSecondary}66`,
  },
});
