import React from "react";
import { StyleSheet, View } from "react-native";
import { colors, spacing, typography } from "../../shared/ui/theme";
import { Text } from "../../shared/ui/components";
import { DialogModal } from "../../shared/ui/overlays";
import { ManagementActionButton } from "../../shared/ui/management";

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
    <DialogModal
      visible={visible}
      title="Upgrade to Pro"
      onRequestClose={onDismiss}
      maxWidth={400}
      footer={
        <View style={styles.actions}>
          {/* BILLING HOOK: Replace onPress with your checkout/payment flow */}
          <ManagementActionButton
            label="Coming Soon"
            tone="primary"
            onPress={onDismiss}
            fullWidth
          />
          <ManagementActionButton
            label="Maybe Later"
            tone="passive"
            onPress={onDismiss}
            fullWidth
          />
        </View>
      }
    >
      <View style={styles.body}>
        <Text style={styles.subtitle}>Unlock premium features:</Text>
        <View style={styles.featureList}>
          {PREMIUM_FEATURES.map((feature) => (
            <View key={feature} style={styles.featureRow}>
              <Text style={styles.checkmark}>✓</Text>
              <Text style={styles.featureText}>{feature}</Text>
            </View>
          ))}
        </View>
      </View>
    </DialogModal>
  );
}

const PREMIUM_FEATURES = [
  "Premium Widgets",
  "Advanced Layouts",
  "Multi-Device Control",
  "Plugin Installation",
];

const styles = StyleSheet.create({
  body: {
    gap: spacing.sm,
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
  actions: {
    gap: spacing.sm,
  },
});
