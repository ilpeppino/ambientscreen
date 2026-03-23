import React from "react";
import { StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { colors, radius, spacing, typography } from "../theme";

interface DisplayFrameProps {
  title?: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function DisplayFrame({
  title,
  subtitle,
  children,
  footer,
}: DisplayFrameProps) {
  return (
    <SafeAreaView style={styles.safeArea}>
      <View style={styles.container}>
        <View pointerEvents="none" style={styles.backgroundGlowTop} />
        <View pointerEvents="none" style={styles.backgroundGlowBottom} />
        {(title || subtitle) && (
          <View style={styles.header}>
            {title ? <Text style={styles.title}>{title}</Text> : null}
            {subtitle ? <Text style={styles.subtitle}>{subtitle}</Text> : null}
          </View>
        )}

        <View style={styles.content}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  container: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    paddingHorizontal: spacing.xl,
  },
  backgroundGlowTop: {
    position: "absolute",
    width: 420,
    height: 420,
    borderRadius: radius.pill,
    top: -260,
    alignSelf: "center",
    backgroundColor: "rgba(255, 255, 255, 0.05)",
  },
  backgroundGlowBottom: {
    position: "absolute",
    width: 320,
    height: 320,
    borderRadius: radius.pill,
    bottom: -220,
    right: -80,
    backgroundColor: "rgba(255, 255, 255, 0.03)",
  },
  header: {
    alignItems: "center",
    paddingTop: spacing.xl,
    paddingBottom: 14,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.title.fontSize,
    fontWeight: "700",
    letterSpacing: 0.8,
    textAlign: "center",
  },
  subtitle: {
    marginTop: 6,
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    textAlign: "center",
  },
  content: {
    flex: 1,
  },
  footer: {
    alignItems: "center",
    paddingBottom: 18,
    paddingTop: spacing.sm,
  },
});
