import React, { useEffect } from "react";
import { Linking, Platform, ScrollView, StyleSheet, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import {
  EmptyPanel,
  ManagementActionButton,
  ActionRow,
  SectionHeader,
} from "../../shared/ui/management";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Text } from "../../shared/ui/components/Text";
import { colors, spacing } from "../../shared/ui/theme";
import { DEEP_LINK_SCHEME, type OAuthCallbackParams } from "../navigation/deepLinks";
import { getGoogleConnectUrl } from "../../services/api/integrationsApi";
import { useIntegrations } from "./integrations.hooks";
import { IntegrationConnectionCard } from "./IntegrationConnectionCard";

interface IntegrationsScreenProps {
  onBack: () => void;
  oauthCallback?: OAuthCallbackParams | null;
}

const CALLBACK_MESSAGES: Record<string, string> = {
  success: "Google account connected.",
  cancelled: "Connection was not completed.",
  error: "Unable to complete connection.",
};

export function IntegrationsScreen({ onBack, oauthCallback }: IntegrationsScreenProps) {
  const { connections, loading, error, reload, rename, refresh, disconnect } = useIntegrations();

  // Refresh the connections list automatically after a successful OAuth return
  useEffect(() => {
    if (oauthCallback?.status === "success") {
      reload();
    }
  // Reload when a new successful callback arrives, not on every render
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [oauthCallback]);

  function handleConnectGoogle() {
    // Pass a deep-link returnTo on native so the backend redirects back into
    // the app after OAuth. On web the default redirect is handled by
    // useWebHistory parsing the path-based callback URL.
    const returnTo = Platform.OS !== "web" ? `${DEEP_LINK_SCHEME}://integrations` : undefined;
    void Linking.openURL(getGoogleConnectUrl(returnTo));
  }

  const callbackMessage = oauthCallback
    ? (CALLBACK_MESSAGES[oauthCallback.status] ?? CALLBACK_MESSAGES.error)
    : null;

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
              label="Connect Google"
              tone="primary"
              onPress={handleConnectGoogle}
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
            message="Connect a Google account to use authenticated widgets like Google Calendar."
            actionLabel="Connect Google"
            onAction={handleConnectGoogle}
          />
        ) : (
          <View style={styles.list}>
            {connections.map((conn) => (
              <IntegrationConnectionCard
                key={conn.id}
                connection={conn}
                onRename={rename}
                onRefresh={refresh}
                onDisconnect={disconnect}
              />
            ))}
          </View>
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
  list: {
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
