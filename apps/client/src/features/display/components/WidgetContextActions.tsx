import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon } from "../../../shared/ui/components";
import { colors, radius, spacing } from "../../../shared/ui/theme";

interface WidgetContextActionsProps {
  visible: boolean;
  onSettings?: (() => void) | undefined;
  onRemove?: (() => void) | undefined;
  onDuplicate?: (() => void) | undefined;
}

function ActionButton({
  icon,
  label,
  onPress,
}: {
  icon: "settings" | "trash" | "plus";
  label: string;
  onPress?: (() => void) | undefined;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      disabled={!onPress}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        !onPress ? styles.actionButtonDisabled : null,
        pressed ? styles.actionButtonPressed : null,
      ]}
    >
      <AppIcon
        name={icon}
        size="sm"
        color={icon === "trash" ? "error" : "textPrimary"}
      />
    </Pressable>
  );
}

export function WidgetContextActions({
  visible,
  onRemove,
}: WidgetContextActionsProps) {
  if (!visible) {
    return null;
  }

  return (
    <View style={styles.row}>
      <ActionButton icon="trash" label="Remove widget" onPress={onRemove} />
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    position: "absolute",
    top: spacing.sm,
    right: spacing.sm,
    flexDirection: "row",
    gap: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: `${colors.textSecondary}66`,
    backgroundColor: `${colors.backgroundPrimary}D9`,
    padding: spacing.xs,
  },
  actionButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: `${colors.surface}CC`,
    backgroundColor: `${colors.surface}99`,
  },
  actionButtonDisabled: {
    opacity: 0.45,
  },
  actionButtonPressed: {
    backgroundColor: `${colors.surface}CC`,
  },
});
