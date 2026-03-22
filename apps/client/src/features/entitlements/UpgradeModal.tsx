import React from "react";
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from "react-native";

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
    padding: 24,
  },
  sheet: {
    backgroundColor: "#1a1a1a",
    borderRadius: 16,
    padding: 24,
    width: "100%",
    maxWidth: 400,
    gap: 12,
    borderWidth: 1,
    borderColor: "#f5a623",
  },
  title: {
    color: "#fff",
    fontSize: 22,
    fontWeight: "800",
    textAlign: "center",
  },
  subtitle: {
    color: "#aaa",
    fontSize: 14,
    textAlign: "center",
  },
  featureList: {
    gap: 8,
    marginVertical: 8,
  },
  featureRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  checkmark: {
    color: "#f5a623",
    fontSize: 16,
    fontWeight: "700",
  },
  featureText: {
    color: "#fff",
    fontSize: 15,
  },
  upgradeButton: {
    backgroundColor: "#f5a623",
    borderRadius: 10,
    paddingVertical: 14,
    alignItems: "center",
    marginTop: 8,
  },
  upgradeButtonLabel: {
    color: "#000",
    fontWeight: "800",
    fontSize: 16,
  },
  dismissButton: {
    paddingVertical: 10,
    alignItems: "center",
  },
  dismissButtonLabel: {
    color: "#888",
    fontSize: 14,
  },
});
