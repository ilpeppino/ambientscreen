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
      <View pointerEvents="none" style={styles.selectionOutline} />
      <View pointerEvents="none" style={styles.dragHandle}>
        <AppIcon name="grid" size="sm" color="textPrimary" />
      </View>
      <View pointerEvents="none" style={[styles.cornerHandle, styles.cornerTopLeft]} />
      <View pointerEvents="none" style={[styles.cornerHandle, styles.cornerTopRight]} />
      <View pointerEvents="none" style={[styles.cornerHandle, styles.cornerBottomLeft]} />
      <View pointerEvents="none" style={[styles.cornerHandle, styles.cornerBottomRight]} />
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
  selectionOutline: {
    ...StyleSheet.absoluteFillObject,
    borderWidth: 2,
    borderColor: `${colors.accentBlue}CC`,
    borderRadius: radius.md,
  },
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
  cornerHandle: {
    position: "absolute",
    width: 10,
    height: 10,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: `${colors.accentBlue}DD`,
    backgroundColor: colors.surfaceCard,
  },
  cornerTopLeft: {
    top: -4,
    left: -4,
  },
  cornerTopRight: {
    top: -4,
    right: -4,
  },
  cornerBottomLeft: {
    bottom: -4,
    left: -4,
  },
  cornerBottomRight: {
    bottom: -4,
    right: -4,
  },
  snapFeedbackLabel: {
    color: colors.textPrimary,
  },
});
