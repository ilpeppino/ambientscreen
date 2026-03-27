import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, spacing, typography } from "../../../shared/ui/theme";

interface InspectorReadOnlyFieldProps {
  label: string;
  /** Formatted display value. Raw enum values and IDs must never be passed here. */
  value: string;
  emptyText?: string;
}

export function InspectorReadOnlyField({
  label,
  value,
  emptyText = "—",
}: InspectorReadOnlyFieldProps) {
  const display = value || emptyText;
  const faded = !value;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, faded ? styles.valueFaded : null]}>{display}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  field: {
    gap: spacing.xs,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
  },
  valueFaded: {
    opacity: 0.6,
  },
});
