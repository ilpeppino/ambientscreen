import React from "react";
import { StyleSheet, Text, View } from "react-native";

interface PremiumLockProps {
  compact?: boolean;
}

/**
 * Visual indicator shown on premium features that the current user cannot access.
 * Use `compact` for inline/badge use.
 */
export function PremiumLock({ compact = false }: PremiumLockProps) {
  if (compact) {
    return (
      <View style={styles.badge}>
        <Text style={styles.badgeText}>PRO</Text>
      </View>
    );
  }

  return (
    <View style={styles.overlay}>
      <Text style={styles.lockIcon}>🔒</Text>
      <Text style={styles.label}>Pro feature</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  overlay: {
    alignItems: "center",
    gap: 4,
  },
  lockIcon: {
    fontSize: 20,
  },
  label: {
    color: "#f5a623",
    fontSize: 12,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  badge: {
    backgroundColor: "#f5a623",
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  badgeText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "800",
    letterSpacing: 0.5,
  },
});
