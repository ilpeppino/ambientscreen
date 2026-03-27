import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { Option } from "./inspector.types";

interface InspectorSegmentedControlProps {
  options: Option[];
  value: string | number;
  onChange: (value: string | number) => void;
  disabled?: boolean;
}

export function InspectorSegmentedControl({
  options,
  value,
  onChange,
  disabled,
}: InspectorSegmentedControlProps) {
  return (
    <View style={styles.row}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            style={[styles.segment, selected ? styles.segmentSelected : null]}
            onPress={() => !disabled && onChange(opt.value)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  segment: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
  },
  segmentSelected: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.accentBlue,
  },
  label: {
    ...typography.compactControl,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textPrimary,
  },
});
