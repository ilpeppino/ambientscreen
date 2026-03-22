import React from "react";
import { StyleSheet, View } from "react-native";
import { AppIcon } from "../../../shared/ui/components";
import { Text } from "../../../shared/ui/components/Text";
import { colors, radius, spacing } from "../../../shared/ui/theme";

interface EditModeHintProps {
  visible: boolean;
}

export function EditModeHint({ visible }: EditModeHintProps) {
  if (!visible) {
    return null;
  }

  return (
    <View pointerEvents="none" style={styles.container}>
      <View style={styles.card}>
        <AppIcon name="grid" size="sm" color="textSecondary" />
        <Text variant="caption" color="textSecondary">
          Tap a widget to edit
        </Text>
        <Text variant="caption" color="textSecondary">
          Drag to move, corner handle to resize
        </Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: spacing.lg,
    left: 0,
    right: 0,
    alignItems: "center",
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.textSecondary}66`,
    backgroundColor: `${colors.backgroundPrimary}CC`,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
});
