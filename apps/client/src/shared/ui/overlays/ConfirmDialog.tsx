/**
 * ConfirmDialog — standardized confirmation for destructive and critical actions.
 *
 * Use for: delete profile, delete device, uninstall plugin, and any irreversible action.
 *
 * Contract:
 *  - dismissible=false: the dialog cannot be dismissed by backdrop tap or Android back.
 *    Users must choose Confirm or Cancel explicitly.
 *  - Destructive actions use confirmTone="destructive" (default).
 *  - Action order (left-to-right): Cancel (passive) — Confirm (destructive/primary).
 *  - Optional warningText for additional irreversibility notices.
 */
import React from "react";
import { StyleSheet, View } from "react-native";
import { DialogModal } from "./DialogModal";
import { ManagementActionButton } from "../management/ActionRow";
import { Text } from "../components/Text";
import { colors, spacing, typography } from "../theme";
import type { ManagementActionTone } from "../management/ActionRow";

export interface ConfirmDialogProps {
  visible: boolean;
  title: string;
  message: string;
  /** Additional warning shown below the message, e.g. "This cannot be undone." */
  warningText?: string;
  confirmLabel?: string;
  /** Visual tone of the confirm button. Default: "destructive". */
  confirmTone?: Extract<ManagementActionTone, "destructive" | "primary">;
  cancelLabel?: string;
  loading?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
}

export function ConfirmDialog({
  visible,
  title,
  message,
  warningText,
  confirmLabel = "Confirm",
  confirmTone = "destructive",
  cancelLabel = "Cancel",
  loading = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  return (
    <DialogModal
      visible={visible}
      title={title}
      onRequestClose={onCancel}
      dismissible={false}
      maxWidth={440}
      footer={
        <View style={styles.actions}>
          <ManagementActionButton
            label={cancelLabel}
            tone="passive"
            onPress={onCancel}
            disabled={loading}
          />
          <ManagementActionButton
            label={confirmLabel}
            tone={confirmTone}
            loading={loading}
            onPress={onConfirm}
          />
        </View>
      }
    >
      <View style={styles.content}>
        <Text style={styles.message}>{message}</Text>
        {warningText ? (
          <Text style={styles.warning}>{warningText}</Text>
        ) : null}
      </View>
    </DialogModal>
  );
}

const styles = StyleSheet.create({
  content: {
    gap: spacing.sm,
  },
  message: {
    color: colors.textSecondary,
    fontSize: typography.body.fontSize,
    lineHeight: 22,
  },
  warning: {
    color: colors.statusWarningText,
    fontSize: typography.small.fontSize,
    lineHeight: 18,
  },
  actions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
});
