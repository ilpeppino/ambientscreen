import React from "react";
import { StyleSheet, View } from "react-native";
import type { AppIconName } from "../components";
import { AppIcon } from "../components/AppIcon";
import { Text } from "../components/Text";
import { spacing } from "../theme";

interface WidgetHeaderProps {
  title: string;
  icon: AppIconName;
  rightContent?: React.ReactNode;
  mode?: "display" | "edit";
}

export function WidgetHeader({
  title,
  icon,
  rightContent,
  mode = "display",
}: WidgetHeaderProps) {
  const isEditMode = mode === "edit";

  return (
    <View style={styles.row}>
      <View style={styles.leftContent}>
        <AppIcon name={icon} size="sm" color={isEditMode ? "textPrimary" : "textSecondary"} />
        <Text
          variant={isEditMode ? "body" : "caption"}
          color={isEditMode ? "textPrimary" : "textSecondary"}
          style={styles.title}
        >
          {title}
        </Text>
      </View>
      {rightContent ? <View style={styles.rightContent}>{rightContent}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: spacing.md,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  title: {
    letterSpacing: 0.3,
  },
  rightContent: {
    marginLeft: spacing.md,
  },
});
