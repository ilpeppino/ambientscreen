import React from "react";
import { StyleSheet, View } from "react-native";
import { AppIcon, type AppIconName } from "../components";
import { Text } from "../components/Text";
import { spacing } from "../theme";

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  icon?: AppIconName;
  rightAction?: React.ReactNode;
}

export function SectionHeader({ title, subtitle, icon, rightAction }: SectionHeaderProps) {
  return (
    <View style={styles.container}>
      <View style={styles.titleWrap}>
        <View style={styles.titleRow}>
          {icon ? <AppIcon name={icon} size="sm" color="textSecondary" /> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      </View>
      {rightAction ? <View style={styles.rightAction}>{rightAction}</View> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.md,
  },
  titleWrap: {
    flex: 1,
    gap: spacing.xs,
  },
  titleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    fontSize: 17,
    fontWeight: "700",
    color: "#ffffff",
  },
  subtitle: {
    color: "#9a9a9a",
    fontSize: 13,
    lineHeight: 19,
  },
  rightAction: {
    alignSelf: "center",
  },
});
