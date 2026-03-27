import React from "react";
import { StyleSheet, View } from "react-native";
import {
  ActionRow,
  EmptyPanel,
  ManagementActionButton,
  SectionHeader,
} from "../../shared/ui/management";
import { ErrorState } from "../../shared/ui/ErrorState";
import { Text } from "../../shared/ui/components/Text";
import { colors, radius, spacing, typography } from "../../shared/ui/theme";
import type { IntegrationProviderDescriptor } from "../../services/api/integrationsApi";

interface IntegrationProviderPickerProps {
  providers: IntegrationProviderDescriptor[];
  loading: boolean;
  error: string | null;
  connectingProvider: string | null;
  tileWidth?: number;
  onSelect: (provider: IntegrationProviderDescriptor) => void;
  onRetry: () => void;
  onClose: () => void;
}

export function IntegrationProviderPicker({
  providers,
  loading,
  error,
  connectingProvider,
  tileWidth,
  onSelect,
  onRetry,
  onClose,
}: IntegrationProviderPickerProps) {
  return (
    <View style={styles.container}>
      <SectionHeader
        icon="settings"
        title="Choose a provider"
        subtitle="Select the service you want to connect. The platform will handle the OAuth flow."
        rightAction={<ManagementActionButton label="Close" tone="passive" onPress={onClose} />}
      />

      {loading ? (
        <EmptyPanel
          variant="loading"
          title="Loading providers"
          message="Fetching supported connection options."
        />
      ) : error ? (
        <ErrorState
          message={error}
          onRetry={onRetry}
        />
      ) : providers.length === 0 ? (
        <EmptyPanel
          title="No providers available"
          message="There are no integration providers available for your account right now."
          actionLabel="Try again"
          onAction={onRetry}
        />
      ) : (
        <View style={styles.list}>
          {providers.map((provider) => {
            const isConnecting = connectingProvider === provider.key;
            const initial = provider.label.trim().charAt(0).toUpperCase() || "?";
            return (
              <View
                key={provider.key}
                style={[styles.tile, tileWidth ? { width: tileWidth } : styles.tileFlex]}
              >
                <View style={styles.header}>
                  <View style={styles.providerRow}>
                    <View style={styles.providerMark}>
                      <Text style={styles.providerInitial}>{initial}</Text>
                    </View>
                    <Text style={styles.providerLabel}>{provider.label}</Text>
                  </View>
                </View>

                <View style={styles.body}>
                  <Text style={styles.providerDescription} numberOfLines={3}>
                    {provider.description}
                  </Text>
                </View>

                <View style={styles.footer}>
                  <ActionRow>
                    <ManagementActionButton
                      label={isConnecting ? "Connecting" : "Connect"}
                      tone="primary"
                      icon="plus"
                      loading={isConnecting}
                      onPress={() => onSelect(provider)}
                    />
                  </ActionRow>
                </View>
              </View>
            );
          })}
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    gap: spacing.md,
  },
  list: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  tile: {
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: spacing.md,
    gap: spacing.sm,
  },
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
  providerDescription: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  footer: {
    gap: spacing.sm,
  },
});
