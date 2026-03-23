import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { colors, spacing, typography } from "../../../shared/ui/theme";

/**
 * Phase 1 placeholder for the dashboard canvas.
 * In Phase 2, this will render the live LayoutGrid canvas with widget editing.
 */
export function DashboardCanvas() {
  return (
    <View style={styles.canvas}>
      <View style={styles.placeholder}>
        <Text style={styles.placeholderTitle}>Canvas</Text>
        <Text style={styles.placeholderMessage}>
          The interactive canvas editor arrives in Phase 2.
          {"\n"}
          Use the sidebar to create and manage widgets.
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    alignItems: "center",
    justifyContent: "center",
  },
  placeholder: {
    maxWidth: 360,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    borderStyle: "dashed",
    alignItems: "center",
    gap: spacing.sm,
  },
  placeholderTitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  placeholderMessage: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
});
