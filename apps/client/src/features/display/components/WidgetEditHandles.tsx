import React from "react";
import { StyleSheet, View } from "react-native";
import { AppIcon } from "../../../shared/ui/components";
import { Text } from "../../../shared/ui/components/Text";
import { colors, radius, spacing } from "../../../shared/ui/theme";

interface WidgetEditHandlesProps {
  visible: boolean;
  snapLabel?: string | null;
  children?: React.ReactNode;
}

export function WidgetEditHandles({
  visible,
  snapLabel = null,
  children,
}: WidgetEditHandlesProps) {
  if (!visible) {
    return null;
  }

  return (
    <>
      <View pointerEvents="none" style={styles.dragHandle}>
        <AppIcon name="grid" size="sm" color="textPrimary" />
      </View>
      {snapLabel ? (
        <View pointerEvents="none" style={styles.snapFeedback}>
          <Text variant="caption" style={styles.snapFeedbackLabel}>
            {snapLabel}
          </Text>
        </View>
      ) : null}
      {children}
    </>
  );
}

const styles = StyleSheet.create({
  dragHandle: {
    position: "absolute",
    top: spacing.sm,
    left: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.accent}88`,
    backgroundColor: `${colors.backgroundPrimary}CC`,
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
  },
  snapFeedback: {
    position: "absolute",
    top: spacing.sm,
    left: "50%",
    marginLeft: -68,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.textSecondary}88`,
    backgroundColor: `${colors.backgroundPrimary}D9`,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  snapFeedbackLabel: {
    color: colors.textPrimary,
  },
});
