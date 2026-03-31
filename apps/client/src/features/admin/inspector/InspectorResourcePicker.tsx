import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import { InspectorDropdown } from "./InspectorDropdown";
import { InspectorAsyncState } from "./InspectorAsyncState";
import type { Option } from "./inspector.types";

interface InspectorResourcePickerProps {
  options: Option[];
  value: string | string[] | null | undefined;
  onChange: (value: string | string[]) => void;
  loading?: boolean;
  error?: string | null;
  disabled?: boolean;
  placeholder?: string;
  selectionMode?: "single" | "multiple";
}

export function InspectorResourcePicker({
  options,
  value,
  onChange,
  loading,
  error,
  disabled,
  placeholder,
  selectionMode = "single",
}: InspectorResourcePickerProps) {
  if (loading) {
    return <InspectorAsyncState status="loading" />;
  }

  if (error) {
    return <InspectorAsyncState status="error" errorMessage={error} />;
  }

  if (options.length === 0) {
    return (
      <InspectorAsyncState
        status="empty"
        emptyMessage={placeholder ?? "No resources available"}
      />
    );
  }

  if (selectionMode === "multiple") {
    return (
      <InspectorMultiResourcePicker
        options={options}
        selectedValues={Array.isArray(value) ? value : []}
        onChange={(values) => onChange(values)}
        disabled={disabled}
        placeholder={placeholder ?? "Select resources..."}
      />
    );
  }

  return (
    <InspectorDropdown
      options={options}
      value={typeof value === "string" ? value : null}
      onChange={(v) => onChange(String(v))}
      disabled={disabled}
    />
  );
}

interface InspectorMultiResourcePickerProps {
  options: Option[];
  selectedValues: string[];
  onChange: (values: string[]) => void;
  disabled?: boolean;
  placeholder: string;
}

function InspectorMultiResourcePicker({
  options,
  selectedValues,
  onChange,
  disabled,
  placeholder,
}: InspectorMultiResourcePickerProps) {
  const [isOpen, setIsOpen] = React.useState(false);
  const selectedSet = new Set(selectedValues);

  const summary = getMultiSelectSummary(options, selectedValues, placeholder);

  function handleToggle(nextValue: string) {
    if (disabled) return;

    if (selectedSet.has(nextValue)) {
      onChange(selectedValues.filter((value) => value !== nextValue));
      return;
    }

    onChange([...selectedValues, nextValue]);
  }

  return (
    <View>
      <Pressable
        style={[
          styles.trigger,
          isOpen && !disabled ? styles.triggerOpen : null,
          disabled ? styles.triggerDisabled : null,
        ]}
        onPress={() => !disabled && setIsOpen((open) => !open)}
        disabled={disabled}
        accessibilityRole="button"
        accessibilityState={{ expanded: isOpen && !disabled, disabled: !!disabled }}
      >
        <Text
          style={[
            styles.triggerLabel,
            selectedValues.length === 0 ? styles.placeholderText : null,
          ]}
          numberOfLines={1}
        >
          {summary}
        </Text>
        <Text style={styles.chevron} aria-hidden>
          {isOpen && !disabled ? "\u25b2" : "\u25be"}
        </Text>
      </Pressable>

      {isOpen && !disabled ? (
        <View style={styles.optionsPanel}>
          {options.map((option) => {
            const optionValue = String(option.value);
            const isSelected = selectedSet.has(optionValue);
            return (
              <Pressable
                key={optionValue}
                style={[styles.optionRow, isSelected ? styles.optionRowSelected : null]}
                onPress={() => handleToggle(optionValue)}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: isSelected }}
              >
                <Text
                  style={[
                    styles.optionLabel,
                    isSelected ? styles.optionLabelSelected : null,
                  ]}
                  numberOfLines={1}
                >
                  {option.label}
                </Text>
                {isSelected ? <Text style={styles.checkmark}>&#x2713;</Text> : null}
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function getMultiSelectSummary(options: Option[], selectedValues: string[], placeholder: string): string {
  if (selectedValues.length === 0) {
    return placeholder;
  }

  const selectedLabels = options
    .filter((option) => selectedValues.includes(String(option.value)))
    .map((option) => option.label);

  if (selectedLabels.length === 1) {
    return selectedLabels[0];
  }

  if (selectedLabels.length === 2) {
    return `${selectedLabels[0]}, ${selectedLabels[1]}`;
  }

  return `${selectedLabels.length} selected`;
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
});
