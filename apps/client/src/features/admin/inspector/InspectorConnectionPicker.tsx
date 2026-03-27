import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import { InspectorDropdown } from "./InspectorDropdown";
import type { Option } from "./inspector.types";

interface InspectorConnectionPickerProps {
  options: Option[];
  value: string | null | undefined;
  onChange: (connectionId: string) => void;
  /** Called when user taps "Connect new account" — OAuth logic lives outside. */
  onConnect: () => void;
  disabled?: boolean;
  helperText?: string;
}

export function InspectorConnectionPicker({
  options,
  value,
  onChange,
  onConnect,
  disabled,
  helperText,
}: InspectorConnectionPickerProps) {
  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.connectButton, disabled ? styles.disabled : null]}
        onPress={onConnect}
        disabled={disabled}
        accessibilityRole="button"
      >
        <Text style={styles.connectLabel}>+ Connect new account</Text>
      </Pressable>

      {options.length > 0 ? (
        <InspectorDropdown
          options={options}
          value={value ?? null}
          onChange={(v) => onChange(String(v))}
          disabled={disabled}
          placeholder="Select account\u2026"
        />
      ) : (
        <Text style={styles.helper}>
          {helperText ?? "No accounts connected yet. Tap above to connect."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  connectButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    alignSelf: "flex-start",
  },
  disabled: {
    opacity: 0.5,
  },
  connectLabel: {
    ...typography.compactControl,
    fontWeight: "600",
    color: colors.accentBlue,
  },
  helper: {
    fontSize: 12,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
