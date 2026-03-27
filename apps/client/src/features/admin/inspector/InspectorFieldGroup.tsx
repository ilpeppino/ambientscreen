import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, spacing, typography } from "../../../shared/ui/theme";

interface InspectorFieldGroupProps {
  label: string;
  helperText?: string;
  disabled?: boolean;
  children: React.ReactNode;
}

/** Wraps an editable field with a label and optional helper text. */
export function InspectorFieldGroup({
  label,
  helperText,
  disabled,
  children,
}: InspectorFieldGroupProps) {
  return (
    <View style={[styles.group, disabled ? styles.groupDisabled : null]}>
      <Text style={styles.label}>{label}</Text>
      {children}
      {helperText ? <Text style={styles.helper}>{helperText}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  group: {
    gap: spacing.xs,
  },
  groupDisabled: {
    opacity: 0.5,
  },
  label: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  helper: {
    ...typography.captionXs,
    color: colors.textSecondary,
    lineHeight: 16,
    opacity: 0.8,
  },
});
