import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { Option } from "./inspector.types";

interface InspectorOptionListProps {
  options: Option[];
  value: string | number | Array<string | number> | null | undefined;
  onChange: (value: string | number | Array<string | number>) => void;
  selectionMode?: "single" | "multiple";
  disabled?: boolean;
  placeholder?: string;
}

export function InspectorOptionList({
  options,
  value,
  onChange,
  selectionMode = "single",
  disabled,
  placeholder,
}: InspectorOptionListProps) {
  if (options.length === 0) {
    return (
      <Text style={styles.placeholder}>{placeholder ?? "No options available"}</Text>
    );
  }

  return (
    <View style={styles.list}>
      {options.map((opt) => {
        const selected = Array.isArray(value)
          ? value.includes(opt.value)
          : opt.value === value;

        const handlePress = () => {
          if (disabled) return;
          if (selectionMode === "multiple") {
            const current = Array.isArray(value) ? value : [];
            const next = selected
              ? current.filter((entry) => entry !== opt.value)
              : [...current, opt.value];
            onChange(next);
            return;
          }
          onChange(opt.value);
        };

        return (
          <Pressable
            key={String(opt.value)}
            style={[styles.row, selected ? styles.rowSelected : null]}
            onPress={handlePress}
            disabled={disabled}
            accessibilityRole={selectionMode === "multiple" ? "checkbox" : "radio"}
            accessibilityState={{ selected }}
          >
            <Text style={[styles.label, selected ? styles.labelSelected : null]}>
              {opt.label}
            </Text>
            {selected ? <Text style={styles.checkmark}>✓</Text> : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  list: {
    gap: spacing.xs,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
  },
  rowSelected: {
    borderColor: colors.accentBlue,
  },
  label: {
    ...typography.compactControl,
    color: colors.textPrimary,
    flex: 1,
  },
  labelSelected: {
    fontWeight: "600",
  },
  checkmark: {
    ...typography.compactControl,
    color: colors.accentBlue,
    fontWeight: "700",
  },
  placeholder: {
    ...typography.compactControl,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
});
