import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, radius, spacing } from "../../../shared/ui/theme";

interface InspectorBooleanFieldProps {
  value: boolean;
  onChange: (value: boolean) => void;
  disabled?: boolean;
}

/** Boolean input rendered as a Yes/No segmented control. */
export function InspectorBooleanField({
  value,
  onChange,
  disabled,
}: InspectorBooleanFieldProps) {
  return (
    <View style={styles.row}>
      {([true, false] as const).map((option) => {
        const selected = value === option;
        return (
          <Pressable
            key={String(option)}
            style={[styles.segment, selected ? styles.segmentSelected : null]}
            onPress={() => !disabled && onChange(option)}
            disabled={disabled}
            accessibilityRole="radio"
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {option ? "Yes" : "No"}
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
    fontSize: 13,
    fontWeight: "500",
    color: colors.textSecondary,
  },
  labelSelected: {
    color: colors.textPrimary,
  },
});
