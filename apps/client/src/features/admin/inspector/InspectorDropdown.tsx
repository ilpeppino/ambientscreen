import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { Option } from "./inspector.types";

interface InspectorDropdownProps {
  options: Option[];
  value: string | number | null | undefined;
  onChange: (value: string | number) => void;
  disabled?: boolean;
  /** Shown in trigger row when no value is selected. */
  placeholder?: string;
}

/**
 * Inline-expand dropdown for single-choice selection from multiple options.
 *
 * Collapsed: a single trigger row showing the current selection (or placeholder).
 * Expanded: trigger row + options panel rendered inline below.
 *
 * Use this for `select`, `connectionPicker` accounts, and `resourcePicker` resources.
 * Use `InspectorOptionList` directly only when an always-visible list is intentionally required.
 */
export function InspectorDropdown({
  options,
  value,
  onChange,
  disabled,
  placeholder = "Select\u2026",
}: InspectorDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (options.length === 0) {
    return (
      <Text style={styles.emptyText}>{placeholder}</Text>
    );
  }

  const selected = options.find((opt) => opt.value === value);

  function handleSelect(optValue: string | number) {
    onChange(optValue);
    setIsOpen(false);
  }

  return (
    <View>
      <Pressable
        style={[
          styles.trigger,
          isOpen && !disabled ? styles.triggerOpen : null,
          disabled ? styles.triggerDisabled : null,
        ]}
        onPress={() => !disabled && setIsOpen((o) => !o)}
        disabled={disabled}
        accessibilityRole="combobox"
        accessibilityState={{ expanded: isOpen && !disabled, disabled: !!disabled }}
      >
        <Text
          style={[styles.triggerLabel, !selected ? styles.placeholderText : null]}
          numberOfLines={1}
        >
          {selected?.label ?? placeholder}
        </Text>
        <Text style={styles.chevron} aria-hidden>
          {isOpen && !disabled ? "\u25b2" : "\u25be"}
        </Text>
      </Pressable>

      {isOpen && !disabled && (
        <View style={styles.optionsPanel}>
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <Pressable
                key={String(opt.value)}
                style={[styles.optionRow, isSelected ? styles.optionRowSelected : null]}
                onPress={() => handleSelect(opt.value)}
                accessibilityRole="radio"
                accessibilityState={{ checked: isSelected }}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected ? styles.optionLabelSelected : null,
                  ]}
                  numberOfLines={1}
                >
                  {opt.label}
                </Text>
                {isSelected ? (
                  <Text style={styles.checkmark}>&#x2713;</Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  trigger: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
  },
  triggerOpen: {
    borderColor: colors.accentBlue,
  },
  triggerDisabled: {
    opacity: 0.5,
  },
  triggerLabel: {
    ...typography.compactControl,
    color: colors.textPrimary,
    flex: 1,
  },
  placeholderText: {
    color: colors.textSecondary,
  },
  chevron: {
    ...typography.compactControl,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
  optionsPanel: {
    marginTop: 2,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInput,
    overflow: "hidden",
  },
  optionRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  optionRowSelected: {
    backgroundColor: colors.statusInfoBg,
  },
  optionLabel: {
    ...typography.compactControl,
    color: colors.textPrimary,
    flex: 1,
  },
  optionLabelSelected: {
    fontWeight: "600",
  },
  checkmark: {
    ...typography.compactControl,
    color: colors.accentBlue,
    fontWeight: "700",
    marginLeft: spacing.xs,
  },
  emptyText: {
    ...typography.compactControl,
    color: colors.textSecondary,
    fontStyle: "italic",
  },
});
