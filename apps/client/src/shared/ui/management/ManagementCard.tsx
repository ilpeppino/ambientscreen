import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { AppIcon, type AppIconName } from "../components";
import { Text } from "../components/Text";
import { radius, spacing } from "../theme";

interface ManagementCardProps {
  title: string;
  subtitle?: string;
  icon?: AppIconName;
  badges?: React.ReactNode;
  children?: React.ReactNode;
  footer?: React.ReactNode;
  onPress?: () => void;
  disabled?: boolean;
}

export function ManagementCard({
  title,
  subtitle,
  icon,
  badges,
  children,
  footer,
  onPress,
  disabled,
}: ManagementCardProps) {
  const body = (
    <View style={[styles.card, disabled ? styles.cardDisabled : null]}>
      <View style={styles.header}>
        <View style={styles.identityRow}>
          {icon ? <AppIcon name={icon} size="sm" color="textSecondary" /> : null}
          <Text style={styles.title}>{title}</Text>
        </View>
        {badges ? <View style={styles.badges}>{badges}</View> : null}
      </View>
      {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
      {children ? <View style={styles.body}>{children}</View> : null}
      {footer ? <View style={styles.footer}>{footer}</View> : null}
    </View>
  );

  if (!onPress) {
    return body;
  }

  return (
    <Pressable accessibilityRole="button" onPress={onPress} disabled={disabled}>
      {body}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: "#111317",
    borderWidth: 1,
    borderColor: "#2a2d34",
    borderRadius: radius.lg,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  cardDisabled: {
    opacity: 0.65,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: spacing.sm,
  },
  identityRow: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  title: {
    color: "#ffffff",
    fontSize: 16,
    fontWeight: "700",
    flexShrink: 1,
  },
  subtitle: {
    color: "#a7a7a7",
    fontSize: 13,
    lineHeight: 19,
  },
  badges: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-end",
    gap: spacing.xs,
  },
  body: {
    gap: spacing.sm,
  },
  footer: {
    marginTop: spacing.xs,
  },
});
