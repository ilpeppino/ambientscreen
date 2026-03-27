import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { colors, spacing, typography } from "../../../shared/ui/theme";
import type { InspectorAction } from "./inspector.types";

interface InspectorSectionProps {
  title: string;
  description?: string;
  actions?: InspectorAction[];
  /** When true, section actions become non-interactive. */
  disabled?: boolean;
  children: React.ReactNode;
}

export function InspectorSection({
  title,
  description,
  actions,
  disabled,
  children,
}: InspectorSectionProps) {
  return (
    <View style={styles.section}>
      <View style={styles.header}>
        <Text style={styles.title}>{title}</Text>
        {actions && actions.length > 0 ? (
          <View style={styles.actionRow}>
            {actions.map((action) => (
              <Pressable
                key={action.label}
                onPress={() => !disabled && action.onClick()}
                disabled={disabled}
                accessibilityRole="button"
              >
                <Text
                  style={[
                    styles.actionLabel,
                    action.variant === "primary"
                      ? styles.actionPrimary
                      : styles.actionSecondary,
                  ]}
                >
                  {action.label}
                </Text>
              </Pressable>
            ))}
          </View>
        ) : null}
      </View>

      {description ? (
        <Text style={styles.description}>{description}</Text>
      ) : null}

      <View style={styles.fields}>{children}</View>
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    gap: spacing.sm,
  },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    ...typography.captionXs,
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  description: {
    fontSize: 12,
    color: colors.textSecondary,
    opacity: 0.8,
    lineHeight: 18,
  },
  actionRow: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  actionLabel: {
    fontSize: 12,
    fontWeight: "500",
  },
  actionPrimary: {
    color: colors.accentBlue,
  },
  actionSecondary: {
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  fields: {
    gap: spacing.md,
  },
});
