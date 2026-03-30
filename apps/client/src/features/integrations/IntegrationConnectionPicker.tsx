import React, { useCallback, useEffect, useState } from "react";
import { Linking, Platform, Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../shared/ui/components/Text";
import { colors, radius, spacing } from "../../shared/ui/theme";
import { DEEP_LINK_SCHEME } from "../navigation/deepLinks";
import { getProviderPresentation } from "./integrations.providers";
import {
  listIntegrationConnections,
  getIntegrationProviderAuthorizationUrl,
  type IntegrationConnection,
} from "../../services/api/integrationsApi";

interface IntegrationConnectionPickerProps {
  provider: string;
  selectedId: string | null | undefined;
  onChange: (connectionId: string) => void;
  disabled?: boolean;
  emptyMessage?: string;
}

export function IntegrationConnectionPicker({
  provider,
  selectedId,
  onChange,
  disabled,
  emptyMessage,
}: IntegrationConnectionPickerProps) {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [connectError, setConnectError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    listIntegrationConnections(provider)
      .then(setConnections)
      .catch(() => setConnections([]))
      .finally(() => setLoading(false));
  }, [provider]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleConnect() {
    const returnTo = Platform.OS !== "web" ? `${DEEP_LINK_SCHEME}://integrations` : undefined;
    setConnecting(true);
    setConnectError(null);
    try {
      const authorizationUrl = await getIntegrationProviderAuthorizationUrl(provider, returnTo);
      await Linking.openURL(authorizationUrl);
    } catch (err) {
      setConnectError(err instanceof Error ? err.message : "Unable to start connection.");
    } finally {
      setConnecting(false);
    }
  }

  const providerPresentation = getProviderPresentation(provider);

  if (loading) {
    return (
      <Text color="textSecondary" variant="caption" style={styles.hint}>
        Loading accounts…
      </Text>
    );
  }

  return (
    <View style={styles.container}>
      <Pressable
        style={[styles.connectButton, disabled ? styles.connectButtonDisabled : null]}
        onPress={handleConnect}
        disabled={disabled || connecting}
      >
        <Text style={styles.connectButtonLabel}>
          {connecting ? "Connecting..." : `Connect ${providerPresentation.label} Account`}
        </Text>
      </Pressable>

      {connectError ? <Text style={styles.errorText}>{connectError}</Text> : null}

      {connections.length > 0 ? (
        <View style={styles.list}>
          <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
            Select account
          </Text>
          {connections.map((conn) => {
            const selected = selectedId === conn.id;
            const label = conn.accountLabel ?? conn.accountEmail ?? conn.externalAccountId ?? conn.provider;
            return (
              <Pressable
                key={conn.id}
                style={[styles.row, selected ? styles.rowSelected : null]}
                onPress={() => !disabled && onChange(conn.id)}
                disabled={disabled}
              >
                <Text style={styles.rowLabel}>{label}</Text>
                {selected ? <Text style={styles.selectedBadge}>Selected</Text> : null}
              </Pressable>
            );
          })}
          <Pressable onPress={load} disabled={disabled} style={styles.refreshLink}>
            <Text style={styles.refreshLinkLabel}>Refresh list</Text>
          </Pressable>
        </View>
      ) : (
        <Text color="textSecondary" variant="caption" style={styles.hint}>
          {emptyMessage ??
            "No accounts connected yet. Tap \"Connect Google Account\" above, then return here and refresh the list."}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.sm,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  connectButton: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    alignItems: "center",
  },
  connectButtonDisabled: {
    opacity: 0.5,
  },
  connectButtonLabel: {
    fontSize: 14,
    fontWeight: "600",
    color: colors.accentBlue,
  },
  list: {
    marginTop: spacing.xs,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
    marginBottom: spacing.xs,
  },
  rowSelected: {
    borderColor: colors.accentBlue,
  },
  rowLabel: {
    fontSize: 13,
    color: colors.textPrimary,
  },
  selectedBadge: {
    fontSize: 11,
    color: colors.accentBlue,
    fontWeight: "600",
  },
  refreshLink: {
    marginTop: spacing.xs,
    alignSelf: "flex-start",
  },
  refreshLinkLabel: {
    fontSize: 12,
    color: colors.textSecondary,
    textDecorationLine: "underline",
  },
  errorText: {
    fontSize: 12,
    color: colors.errorStrong,
  },
  hint: {
    marginTop: spacing.sm,
  },
});
