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
}

export function WidgetHeader({ title, icon, rightContent }: WidgetHeaderProps) {
  return (
    <View style={styles.row}>
      <View style={styles.leftContent}>
        <AppIcon name={icon} size="sm" color="textSecondary" />
        <Text variant="subtitle">{title}</Text>
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
    marginBottom: spacing.lg,
  },
  leftContent: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  rightContent: {
    marginLeft: spacing.md,
  },
});
