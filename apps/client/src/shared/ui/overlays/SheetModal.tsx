/**
 * SheetModal — full-screen page sheet overlay.
 *
 * Use for: detail views, plugin info panels, full-height flows.
 * Renders as a native page sheet on iOS (slide animation, drag-to-dismiss).
 * Falls back to a full-screen modal on Android/web.
 *
 * Contract:
 *  - optional title slot (visible in top bar when provided)
 *  - children: scrollable body content (consumer wraps in ScrollView if needed)
 *  - footer slot: sticky action row pinned at the bottom
 *  - close button always rendered in top bar
 *  - dismiss: close button, Android back, iOS drag-to-dismiss
 */
import React from "react";
import { Modal, StyleSheet, View } from "react-native";
import { ManagementActionButton } from "../management/ActionRow";
import { Text } from "../components/Text";
import { colors, spacing, typography } from "../theme";

export interface SheetModalProps {
  visible: boolean;
  title?: string;
  onRequestClose: () => void;
  children: React.ReactNode;
  footer?: React.ReactNode;
}

export function SheetModal({
  visible,
  title,
  onRequestClose,
  children,
  footer,
}: SheetModalProps) {
  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onRequestClose}
    >
      <View style={styles.container}>
        <View style={styles.topBar}>
          {title ? (
            <Text style={styles.topBarTitle} accessibilityRole="header">
              {title}
            </Text>
          ) : (
            <View />
          )}
          <ManagementActionButton
            label="Close"
            tone="passive"
            icon="close"
            onPress={onRequestClose}
          />
        </View>

        <View style={styles.body}>{children}</View>

        {footer ? <View style={styles.footer}>{footer}</View> : null}
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.backgroundScreen,
    paddingTop: spacing.lg,
    paddingHorizontal: spacing.screenPadding,
    gap: spacing.md,
  },
  topBar: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  topBarTitle: {
    color: colors.textPrimary,
    fontSize: typography.heading.fontSize,
    fontWeight: "700",
  },
  body: {
    flex: 1,
  },
  footer: {
    paddingBottom: spacing.xl,
  },
});
