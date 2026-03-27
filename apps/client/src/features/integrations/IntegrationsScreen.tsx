import React, { useEffect, useState } from "react";
import { Linking, Platform, ScrollView, StyleSheet, useWindowDimensions, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyPanel,
  ManagementActionButton,
  ActionRow,
  SectionHeader,
  SearchBar,
} from "../../shared/ui/management";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Text } from "../../shared/ui/components/Text";
import { colors, spacing } from "../../shared/ui/theme";
import { DEEP_LINK_SCHEME, type OAuthCallbackParams } from "../navigation/deepLinks";
import { getAvailableProviders } from "./integrations.providers";
import { useIntegrations } from "./integrations.hooks";
import { IntegrationConnectionTile } from "./IntegrationConnectionTile";
import { filterConnections } from "./integrations.utils";

interface IntegrationsScreenProps {
  onBack: () => void;
  oauthCallback?: OAuthCallbackParams | null;
}

const CALLBACK_MESSAGES: Record<string, string> = {
  success: "Account connected successfully.",
  cancelled: "Connection was not completed.",
  error: "Unable to complete connection.",
};

export function IntegrationsScreen({ onBack, oauthCallback }: IntegrationsScreenProps) {
  const { connections, loading, error, reload, rename, refresh, disconnect } = useIntegrations();
  const [searchQuery, setSearchQuery] = useState("");
  const { width } = useWindowDimensions();

  // Responsive column count based on available window width
  const numColumns = width >= 1200 ? 4 : width >= 900 ? 3 : width >= 600 ? 2 : 1;
  const containerWidth = width - spacing.lg * 2;
  const tileWidth = Math.floor((containerWidth - spacing.md * (numColumns - 1)) / numColumns);

  // Refresh connections list automatically after a successful OAuth return
  useEffect(() => {
    if (oauthCallback?.status === "success") {
      reload();
    }
  // Reload when a new successful callback arrives, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthCallback]);

  function handleConnect() {
    const providers = getAvailableProviders();
    if (providers.length === 0) return;
    // Single provider: connect directly.
    // Future: when multiple providers exist, show a provider picker here.
    const provider = providers[0];
    const returnTo = Platform.OS !== "web" ? `${DEEP_LINK_SCHEME}://integrations` : undefined;
    void Linking.openURL(provider.getConnectUrl(returnTo));
  }

  const callbackMessage = oauthCallback
    ? (CALLBACK_MESSAGES[oauthCallback.status] ?? CALLBACK_MESSAGES.error)
    : null;

  const filtered = filterConnections(connections, searchQuery);
  const hasQuery = searchQuery.trim() !== "";

  return (
    <SafeAreaView style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        {callbackMessage ? (
          <View
            style={[
              styles.banner,
              oauthCallback?.status === "success" ? styles.bannerSuccess : styles.bannerWarn,
            ]}
          >
            <Text style={styles.bannerText}>{callbackMessage}</Text>
          </View>
        ) : null}

        <SectionHeader
          icon="settings"
          title="Connected Accounts"
          subtitle="Manage your provider connections for authenticated widgets."
          rightAction={
            <ManagementActionButton
              label="Add Connection"
              tone="primary"
              icon="plus"
              onPress={handleConnect}
            />
          }
        />

        {loading ? (
          <EmptyPanel variant="loading" title="Loading connections" message="Fetching your connected accounts." />
        ) : error ? (
          <ErrorState message={error} onRetry={reload} />
        ) : connections.length === 0 ? (
          <EmptyPanel
            title="No connections yet."
            message="Connect an account to use authenticated widgets like Google Calendar."
            actionLabel="Add Connection"
            onAction={handleConnect}
          />
        ) : (
          <>
            <SearchBar
              value={searchQuery}
              onChangeText={setSearchQuery}
              placeholder="Search by provider or account"
            />

            {filtered.length === 0 && hasQuery ? (
              <EmptyPanel
                title="No results"
                message="No connections match your search. Try a different term or clear the search."
              />
            ) : (
              <View style={styles.tileGrid}>
                {filtered.map((conn) => (
                  <IntegrationConnectionTile
                    key={conn.id}
                    connection={conn}
                    tileWidth={tileWidth}
                    onRename={rename}
                    onRefresh={refresh}
                    onDisconnect={disconnect}
                  />
                ))}
              </View>
            )}
          </>
        )}

        <ActionRow>
          <ManagementActionButton label="Back" tone="passive" onPress={onBack} />
          <ManagementActionButton label="Refresh" tone="secondary" icon="refresh" onPress={reload} />
        </ActionRow>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
  },
  scroll: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
  tileGrid: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.md,
  },
  banner: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: 6,
    borderWidth: 1,
  },
  bannerSuccess: {
    backgroundColor: colors.statusSuccessBg,
    borderColor: colors.statusSuccessBorder,
  },
  bannerWarn: {
    backgroundColor: colors.statusWarningBg,
    borderColor: colors.statusWarningBorder,
  },
  bannerText: {
    fontSize: 14,
    color: colors.textPrimary,
  },
});
