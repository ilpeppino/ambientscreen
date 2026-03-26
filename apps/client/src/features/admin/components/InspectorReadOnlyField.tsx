import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components";
import { colors, spacing, typography } from "../../../shared/ui/theme";

interface InspectorReadOnlyFieldProps {
  label: string;
  value: string;
  emptyText?: string;
  faded?: boolean;
}

export function InspectorReadOnlyField({
  label,
  value,
  emptyText = "—",
  faded = false,
}: InspectorReadOnlyFieldProps) {
  const displayValue = value || emptyText;

  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <Text style={[styles.value, faded ? styles.valueFaded : null]}>{displayValue}</Text>
    </View>
  );
}

interface InspectorReadOnlySectionProps {
  title: string;
  children: React.ReactNode;
}

export function InspectorReadOnlySection({ title, children }: InspectorReadOnlySectionProps) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      <View style={styles.sectionContent}>{children}</View>
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
    opacity: 0.72,
  },
  section: {
    gap: spacing.sm,
  },
  sectionTitle: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.6,
  },
  sectionContent: {
    gap: spacing.sm,
  },
});
