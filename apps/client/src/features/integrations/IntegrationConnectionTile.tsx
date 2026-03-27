import React, { useState } from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { ActionRow, ManagementActionButton } from "../../shared/ui/management";
import { AppIcon, type AppIconName } from "../../shared/ui/components";
import { TextInput } from "../../shared/ui/components/TextInput";
import { ConfirmDialog } from "../../shared/ui/overlays";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Text } from "../../shared/ui/components/Text";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";
import { getProviderPresentation } from "./integrations.providers";
import { colors, radius, spacing, typography } from "../../shared/ui/theme";
import type { IntegrationConnection } from "../../services/api/integrationsApi";

interface IntegrationConnectionTileProps {
  connection: IntegrationConnection;
  /** Explicit pixel width from the responsive grid. Falls back to flex sizing when omitted. */
  tileWidth?: number;
  onRename: (id: string, accountLabel: string | null) => Promise<void>;
  onRefresh: (id: string) => Promise<IntegrationConnection>;
  onDisconnect: (id: string) => Promise<void>;
}

interface TileIconButtonProps {
  icon: AppIconName;
  label: string;
  tone?: "default" | "destructive";
  loading?: boolean;
  disabled?: boolean;
  onPress: () => void;
}

function TileIconButton({
  icon,
  label,
  tone = "default",
  loading,
  disabled,
  onPress,
}: TileIconButtonProps) {
  const isDestructive = tone === "destructive";
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      accessibilityState={{ disabled: Boolean(disabled || loading) }}
      style={[
        styles.iconBtn,
        isDestructive ? styles.iconBtnDestructive : styles.iconBtnDefault,
        (disabled || loading) ? styles.iconBtnDisabled : null,
      ]}
      disabled={disabled || loading}
      onPress={onPress}
    >
      <AppIcon
        name={loading ? "refresh" : icon}
        size="sm"
        color={isDestructive ? "error" : "textPrimary"}
      />
    </Pressable>
  );
}

export function tilePrimaryLabel(connection: IntegrationConnection): string {
  return (
    connection.accountLabel ??
    connection.accountEmail ??
    connection.externalAccountId ??
    connection.provider
  );
}

export function tileSecondaryLabel(connection: IntegrationConnection): string | undefined {
  const parts: string[] = [];
  if (connection.accountLabel && connection.accountEmail) {
    parts.push(connection.accountEmail);
  }
  if (connection.lastSyncedAt) {
    try {
      parts.push(`Synced ${new Date(connection.lastSyncedAt).toLocaleDateString()}`);
    } catch {
      // ignore invalid dates
    }
  }
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function IntegrationConnectionTile({
  connection,
  tileWidth,
  onRename,
  onRefresh,
  onDisconnect,
}: IntegrationConnectionTileProps) {
  const provider = getProviderPresentation(connection.provider);
  const primaryLabel = tilePrimaryLabel(connection);
  const secondaryLabel = tileSecondaryLabel(connection);

  const [renaming, setRenaming] = useState(false);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameLoading, setRenameLoading] = useState(false);
  const [renameError, setRenameError] = useState<string | null>(null);

  const [refreshLoading, setRefreshLoading] = useState(false);
  const [refreshError, setRefreshError] = useState<string | null>(null);

  const [confirmDisconnect, setConfirmDisconnect] = useState(false);
  const [disconnectLoading, setDisconnectLoading] = useState(false);

  function handleBeginRename() {
    setRenameDraft(connection.accountLabel ?? "");
    setRenameError(null);
    setRenaming(true);
  }

  function handleCancelRename() {
    setRenaming(false);
    setRenameError(null);
  }

  async function handleSaveRename() {
    const trimmed = renameDraft.trim();
    setRenameLoading(true);
    setRenameError(null);
    try {
      await onRename(connection.id, trimmed === "" ? null : trimmed);
      setRenaming(false);
    } catch (err) {
      setRenameError(err instanceof Error ? err.message : "Unable to rename connection.");
    } finally {
      setRenameLoading(false);
    }
  }

  async function handleRefresh() {
    setRefreshLoading(true);
    setRefreshError(null);
    try {
      await onRefresh(connection.id);
    } catch (err) {
      setRefreshError(err instanceof Error ? err.message : "Unable to refresh connection.");
    } finally {
      setRefreshLoading(false);
    }
  }

  async function handleDisconnect() {
    setDisconnectLoading(true);
    try {
      await onDisconnect(connection.id);
    } catch {
      // If disconnect fails, close dialog and leave list as-is
    } finally {
      setDisconnectLoading(false);
      setConfirmDisconnect(false);
    }
  }

  return (
    <>
      <View style={[styles.tile, tileWidth ? { width: tileWidth } : styles.tileFlex]}>
        {/* Header: provider mark + label + status badge */}
        <View style={styles.header}>
          <View style={styles.providerRow}>
            <View style={styles.providerMark}>
              <Text style={styles.providerInitial}>{provider.initial}</Text>
            </View>
            <Text style={styles.providerLabel}>{provider.label}</Text>
          </View>
          <IntegrationStatusBadge status={connection.status} />
        </View>

        {/* Body: primary account label + secondary metadata */}
        <View style={styles.body}>
          <Text style={styles.accountLabel} numberOfLines={1}>
            {primaryLabel}
          </Text>
          {secondaryLabel ? (
            <Text style={styles.accountMeta} numberOfLines={2}>
              {secondaryLabel}
            </Text>
          ) : null}
        </View>

        {/* Footer: inline rename form or icon-only action buttons */}
        <View style={styles.footer}>
          {renaming ? (
            <View style={styles.renameBlock}>
              <TextInput
                label="Account label"
                value={renameDraft}
                onChangeText={setRenameDraft}
                placeholder="My Account"
                editable={!renameLoading}
                autoFocus
              />
              <ActionRow>
                <ManagementActionButton
                  label="Save"
                  tone="primary"
                  loading={renameLoading}
                  onPress={handleSaveRename}
                />
                <ManagementActionButton
                  label="Cancel"
                  tone="passive"
                  disabled={renameLoading}
                  onPress={handleCancelRename}
                />
              </ActionRow>
              {renameError ? <ErrorState compact message={renameError} /> : null}
            </View>
          ) : (
            <View style={styles.iconRow}>
              <TileIconButton
                icon="pencil"
                label="Rename"
                onPress={handleBeginRename}
              />
              <TileIconButton
                icon="refresh"
                label="Refresh"
                loading={refreshLoading}
                onPress={handleRefresh}
              />
              <TileIconButton
                icon="trash"
                label="Disconnect"
                tone="destructive"
                onPress={() => setConfirmDisconnect(true)}
              />
            </View>
          )}
          {refreshError ? <ErrorState compact message={refreshError} /> : null}
        </View>
      </View>

      <ConfirmDialog
        visible={confirmDisconnect}
        title="Disconnect account?"
        message={`This will remove the connection to ${primaryLabel}.`}
        warningText="Widgets using this connection will need to be reconfigured."
        confirmLabel="Disconnect"
        cancelLabel="Cancel"
        loading={disconnectLoading}
        onConfirm={handleDisconnect}
        onCancel={() => setConfirmDisconnect(false)}
      />
    </>
  );
}

const styles = StyleSheet.create({
  tile: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
  /** Fallback flex sizing used when no explicit tileWidth is provided. */
  tileFlex: {
    flexBasis: "47%",
    flexGrow: 1,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  providerRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  providerMark: {
    width: 22,
    height: 22,
    borderRadius: radius.sm,
    backgroundColor: colors.buttonSecondaryBg,
    borderWidth: 1,
    borderColor: colors.buttonSecondaryBorder,
    alignItems: "center",
    justifyContent: "center",
  },
  providerInitial: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.buttonSecondaryText,
  },
  providerLabel: {
    ...typography.caption,
    fontWeight: "600",
    color: colors.textSecondary,
  },
  body: {
    gap: spacing.xs,
  },
  accountLabel: {
    ...typography.body,
    fontWeight: "600",
    color: colors.textPrimary,
  },
  accountMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    gap: spacing.sm,
  },
  renameBlock: {
    gap: spacing.sm,
  },
  iconRow: {
    flexDirection: "row",
    gap: spacing.xs,
    alignItems: "center",
  },
  iconBtn: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtnDefault: {
    backgroundColor: colors.buttonSecondaryBg,
    borderColor: colors.buttonSecondaryBorder,
  },
  iconBtnDestructive: {
    backgroundColor: colors.statusDangerBg,
    borderColor: colors.statusDangerBorderAlt,
  },
  iconBtnDisabled: {
    opacity: 0.6,
  },
});
