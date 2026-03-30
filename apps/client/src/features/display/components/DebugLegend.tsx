import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { useDevSettings } from "../../../core/devSettings/devSettings.context";

interface DebugLegendProps {
  editMode: boolean;
  bottom: number;
  right: number;
}

const LEGEND_ITEMS = [
  { key: "showRegionBounds" as const, label: "Regions", color: "#fb923c" },
  { key: "showContentBounds" as const, label: "Content", color: "#22d3ee" },
  { key: "showGridLines" as const, label: "Grid", color: "#a78bfa" },
] as const;

export function DebugLegend({ editMode, bottom, right }: DebugLegendProps) {
  const { settings, update } = useDevSettings();

  if (!__DEV__ || !editMode || !settings.debugOverlayEnabled) {
    return null;
  }

  return (
    <View
      style={[styles.container, { bottom, right }]}
      // @ts-ignore — pointerEvents as prop is valid in RN but TS sometimes flags it
      pointerEvents="box-none"
    >
      {LEGEND_ITEMS.map(({ key, label, color }) => (
        <Pressable
          key={key}
          accessibilityRole="checkbox"
          accessibilityState={{ checked: settings[key] }}
          style={styles.row}
          onPress={() => update({ [key]: !settings[key] })}
        >
          <View
            style={[
              styles.swatch,
              {
                borderColor: color,
                backgroundColor: settings[key] ? color : "transparent",
              },
            ]}
          />
          <Text style={[styles.label, !settings[key] && styles.labelOff]}>
            {label}
          </Text>
        </Pressable>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    zIndex: 50,
    backgroundColor: "rgba(0,0,0,0.8)",
    borderRadius: 7,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 9,
    paddingVertical: 7,
    gap: 3,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingVertical: 2,
  },
  swatch: {
    width: 9,
    height: 9,
    borderRadius: 2,
    borderWidth: 1.5,
  },
  label: {
    fontSize: 10,
    color: "rgba(255,255,255,0.85)",
    fontWeight: "600",
    letterSpacing: 0.3,
  },
  labelOff: {
    color: "rgba(255,255,255,0.35)",
  },
});
