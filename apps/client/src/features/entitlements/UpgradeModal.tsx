import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../shared/ui/theme";

interface UpgradeModalProps {
  visible: boolean;
  onDismiss: () => void;
}

/**
 * Upgrade to Pro modal — placeholder for future billing integration.
 *
 * BILLING HOOK: Replace the "Upgrade" button's onPress handler with your
 * payment flow (Stripe Checkout, RevenueCat, etc.) when billing is integrated.
 */
export function UpgradeModal({ visible, onDismiss }: UpgradeModalProps) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.backdrop}>
        <View style={styles.sheet}>
          <Text style={styles.title}>Upgrade to Pro</Text>
          <Text style={styles.subtitle}>Unlock premium features:</Text>

          <View style={styles.featureList}>
            {PREMIUM_FEATURES.map((feature) => (
              <View key={feature} style={styles.featureRow}>
                <Text style={styles.checkmark}>✓</Text>
                <Text style={styles.featureText}>{feature}</Text>
              </View>
            ))}
          </View>

          {/* BILLING HOOK: Replace onPress with your checkout/payment flow */}
          <Pressable style={styles.upgradeButton} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.upgradeButtonLabel}>Coming Soon</Text>
          </Pressable>

          <Pressable style={styles.dismissButton} onPress={onDismiss} accessibilityRole="button">
            <Text style={styles.dismissButtonLabel}>Maybe Later</Text>
          </Pressable>
        </View>
      </View>
    </Modal>
  );
}

const PREMIUM_FEATURES = [
  "Premium Widgets",
  "Advanced Layouts",
  "Multi-Device Control",
  "Plugin Installation",
];

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.75)",
    justifyContent: "center",
    alignItems: "center",
    padding: spacing.xl,
  },
  sheet: {
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    padding: spacing.xl,
    width: "100%",
    maxWidth: 400,
    gap: spacing.md,
    borderWidth: 1,
    borderColor: colors.accent,
  },
  title: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: colors.textSecondary,
    fontSize: typography.label.fontSize,
    textAlign: "center",
  },
  featureList: {
    gap: spacing.sm,
    marginVertical: spacing.sm,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkmark: {
    color: colors.accent,
    fontSize: typography.body.fontSize,
    fontWeight: "700",
  },
  featureText: {
    color: colors.textPrimary,
    fontSize: 15,
  },
  upgradeButton: {
    backgroundColor: colors.accent,
    borderRadius: radius.sm,
    paddingVertical: spacing.lg,
    alignItems: "center",
    marginTop: 8,
  },
  upgradeButtonLabel: {
    color: colors.backgroundPrimary,
    fontWeight: "800",
    fontSize: typography.body.fontSize,
  },
  dismissButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  dismissButtonLabel: {
    color: colors.textSecondary,
    fontSize: typography.label.fontSize,
  },
});
