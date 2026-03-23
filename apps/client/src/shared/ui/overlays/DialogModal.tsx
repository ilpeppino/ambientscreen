/**
 * DialogModal — centered card overlay.
 *
 * Use for: settings panels, upsell dialogs, informational modals.
 * Renders a floating card over a dark backdrop.
 *
 * Contract:
 *  - title slot: bold heading at top of card
 *  - children: scrollable body (wrap in ScrollView if content overflows)
 *  - footer slot: action buttons, rendered below body
 *  - dismissible=true (default): backdrop tap and Android back close the modal
 *  - dismissible=false: only explicit actions can close (use for destructive confirms)
 *  - KeyboardAvoidingView: card shifts up when keyboard appears
 */
import React from "react";
import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  View,
} from "react-native";
import { Text } from "../components/Text";
import { colors, radius, spacing, typography } from "../theme";

export interface DialogModalProps {
  visible: boolean;
  title: string;
  onRequestClose: () => void;
  /** Whether backdrop tap and Android back button close the modal. Default: true. */
  dismissible?: boolean;
  children: React.ReactNode;
  footer?: React.ReactNode;
  /** Max card width in px. Default: 560. */
  maxWidth?: number;
}

export function DialogModal({
  visible,
  title,
  onRequestClose,
  dismissible = true,
  children,
  footer,
  maxWidth = 560,
}: DialogModalProps) {
  function handleBackdropPress() {
    if (dismissible) {
      onRequestClose();
    }
  }

  function handleRequestClose() {
    if (dismissible) {
      onRequestClose();
    }
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={handleRequestClose}
      statusBarTranslucent
    >
      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === "ios" ? "padding" : "height"}
      >
        <Pressable style={styles.backdrop} onPress={handleBackdropPress}>
          {/* Inner Pressable stops event propagation so tapping the card does not dismiss */}
          <Pressable
            style={[styles.card, { maxWidth }]}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.title} accessibilityRole="header">
              {title}
            </Text>

            <View style={styles.body}>{children}</View>

            {footer ? <View style={styles.footer}>{footer}</View> : null}
          </Pressable>
        </Pressable>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  card: {
    width: "100%",
    maxHeight: "85%",
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceModal,
    borderWidth: 1,
    borderColor: colors.borderInput,
    padding: spacing.lg,
    gap: spacing.md,
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
  },
  body: {
    flexShrink: 1,
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
});
