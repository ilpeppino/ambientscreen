import React, { useState } from "react";
import { StyleSheet, View } from "react-native";
import { ManagementCard, ActionRow, ManagementActionButton } from "../../shared/ui/management";
import { TextInput } from "../../shared/ui/components/TextInput";
import { ConfirmDialog } from "../../shared/ui/overlays";
import { ErrorState } from "../../shared/ui/ErrorState";
import { IntegrationStatusBadge } from "./IntegrationStatusBadge";
import { spacing } from "../../shared/ui/theme";
import type { IntegrationConnection } from "../../services/api/integrationsApi";

interface IntegrationConnectionCardProps {
  connection: IntegrationConnection;
  onRename: (id: string, accountLabel: string | null) => Promise<void>;
  onRefresh: (id: string) => Promise<IntegrationConnection>;
  onDisconnect: (id: string) => Promise<void>;
}

function formatLastSynced(lastSyncedAt: string | null): string | undefined {
  if (!lastSyncedAt) return undefined;
  try {
    return `Last synced ${new Date(lastSyncedAt).toLocaleDateString()}`;
  } catch {
    return undefined;
  }
}

function connectionTitle(connection: IntegrationConnection): string {
  return connection.accountLabel ?? connection.accountEmail ?? connection.externalAccountId ?? connection.provider;
}

function connectionSubtitle(connection: IntegrationConnection): string | undefined {
  const parts: string[] = [];
  if (connection.accountLabel && connection.accountEmail) {
    parts.push(connection.accountEmail);
  }
  const lastSynced = formatLastSynced(connection.lastSyncedAt);
  if (lastSynced) parts.push(lastSynced);
  return parts.length > 0 ? parts.join(" · ") : undefined;
}

export function IntegrationConnectionCard({
  connection,
  onRename,
  onRefresh,
  onDisconnect,
}: IntegrationConnectionCardProps) {
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
      // If disconnect fails, close dialog and let the list stay as-is
    } finally {
      setDisconnectLoading(false);
      setConfirmDisconnect(false);
    }
  }

  return (
    <>
      <ManagementCard
        title={connectionTitle(connection)}
        subtitle={connectionSubtitle(connection)}
        badges={<IntegrationStatusBadge status={connection.status} />}
        footer={
          <View style={styles.footer}>
            {renaming ? (
              <View style={styles.renameBlock}>
                <TextInput
                  label="Account label"
                  value={renameDraft}
                  onChangeText={setRenameDraft}
                  placeholder="My Google Account"
                  editable={!renameLoading}
                  autoFocus
                />
                <ActionRow>
                  <ManagementActionButton label="Save" tone="primary" loading={renameLoading} onPress={handleSaveRename} />
                  <ManagementActionButton label="Cancel" tone="passive" disabled={renameLoading} onPress={handleCancelRename} />
                </ActionRow>
                {renameError ? <ErrorState compact message={renameError} /> : null}
              </View>
            ) : (
              <ActionRow>
                <ManagementActionButton label="Rename" tone="secondary" onPress={handleBeginRename} />
                <ManagementActionButton
                  label="Refresh"
                  tone="secondary"
                  icon="refresh"
                  loading={refreshLoading}
                  onPress={handleRefresh}
                />
                <ManagementActionButton
                  label="Disconnect"
                  tone="destructive"
                  icon="trash"
                  onPress={() => setConfirmDisconnect(true)}
                />
              </ActionRow>
            )}
            {refreshError ? <ErrorState compact message={refreshError} /> : null}
          </View>
        }
      />

      <ConfirmDialog
        visible={confirmDisconnect}
        title="Disconnect account?"
        message={`This will remove the connection to ${connectionTitle(connection)}.`}
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
  footer: {
    gap: spacing.sm,
  },
  renameBlock: {
    gap: spacing.sm,
  },
});
