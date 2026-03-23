import React, { useCallback, useEffect, useMemo, useState } from "react";
import { SafeAreaView, ScrollView, StyleSheet, Switch, View } from "react-native";
import { colors, spacing, typography } from "../../../shared/ui/theme";
import type { Device } from "@ambient/shared-contracts";
import { Text } from "../../../shared/ui/components";
import {
  ActionRow,
  EmptyPanel,
  InlineStatusBadge,
  ManagementActionButton,
  ManagementCard,
  SectionHeader,
} from "../../../shared/ui/management";
import { getDevices, sendDeviceCommand } from "../../../services/api/devicesApi";
import { useCloudProfiles } from "../../profiles/useCloudProfiles";
import { DeviceCard } from "../../devices/DeviceCard";

interface RemoteControlScreenProps {
  currentDeviceId: string | null;
  onBack: () => void;
}

export function RemoteControlScreen({ currentDeviceId, onBack }: RemoteControlScreenProps) {
  const { profiles } = useCloudProfiles();
  const [devices, setDevices] = useState<Device[]>([]);
  const [selectedDeviceId, setSelectedDeviceId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [slideshowEnabled, setSlideshowEnabled] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadDevices = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await getDevices();
      setDevices(response);
      setSelectedDeviceId((current) => {
        if (current && response.some((device) => device.id === current)) {
          return current;
        }

        return response.find((device) => device.id !== currentDeviceId)?.id ?? response[0]?.id ?? null;
      });
    } catch (devicesError) {
      setError(devicesError instanceof Error ? devicesError.message : "Failed to load devices");
      setDevices([]);
    } finally {
      setLoading(false);
    }
  }, [currentDeviceId]);

  useEffect(() => {
    void loadDevices();
  }, [loadDevices]);

  const selectedDevice = useMemo(
    () => devices.find((device) => device.id === selectedDeviceId) ?? null,
    [devices, selectedDeviceId],
  );

  const runCommand = useCallback(async (run: () => Promise<void>) => {
    if (!selectedDeviceId || sending) {
      return;
    }

    try {
      setSending(true);
      setError(null);
      await run();
      await loadDevices();
    } catch (commandError) {
      setError(commandError instanceof Error ? commandError.message : "Failed to send command");
    } finally {
      setSending(false);
    }
  }, [loadDevices, selectedDeviceId, sending]);

  async function handleRefreshTarget() {
    if (!selectedDeviceId) {
      return;
    }

    await runCommand(async () => {
      await sendDeviceCommand(selectedDeviceId, { type: "REFRESH" });
    });
  }

  async function handleSetProfile(profileId: string) {
    if (!selectedDeviceId) {
      return;
    }

    await runCommand(async () => {
      await sendDeviceCommand(selectedDeviceId, {
        type: "SET_PROFILE",
        profileId,
      });
    });
  }

  async function handleToggleSlideshow(nextValue: boolean) {
    if (!selectedDeviceId) {
      return;
    }

    setSlideshowEnabled(nextValue);
    await runCommand(async () => {
      await sendDeviceCommand(selectedDeviceId, {
        type: "SET_SLIDESHOW",
        enabled: nextValue,
      });
    });
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.topBar}>
        <ManagementActionButton label="Back" tone="passive" icon="chevronLeft" onPress={onBack} />
      </View>

      <View style={styles.content}>
        <SectionHeader
          icon="settings"
          title="Remote Control"
          subtitle="Send profile and refresh commands to a selected device."
          rightAction={
            selectedDevice ? (
              <InlineStatusBadge
                label={`Controlling ${selectedDevice.name}`}
                tone="info"
                icon="grid"
              />
            ) : null
          }
        />

        {loading ? (
          <EmptyPanel
            variant="loading"
            title="Loading devices"
            message="Syncing available devices for remote control."
          />
        ) : devices.length === 0 ? (
          <EmptyPanel
            title="No devices registered"
            message="Register a display device first, then return here to control it remotely."
          />
        ) : (
          <>
            <SectionHeader
              title="Target Device"
              subtitle="Choose which device should receive commands."
              icon="grid"
            />

            <ScrollView style={styles.devicesList} contentContainerStyle={styles.devicesContent}>
              {devices.map((device) => {
                const selected = device.id === selectedDeviceId;

                return (
                  <DeviceCard
                    key={device.id}
                    device={device}
                    selected={selected}
                    isCurrentDevice={device.id === currentDeviceId}
                    onPress={() => setSelectedDeviceId(device.id)}
                  />
                );
              })}
            </ScrollView>

            <ManagementCard title="Actions" subtitle="Run commands on the selected device." icon="refresh">
              <ActionRow>
                <ManagementActionButton
                  label="Refresh target"
                  tone="primary"
                  icon="refresh"
                  disabled={!selectedDevice}
                  loading={sending}
                  onPress={() => {
                    void handleRefreshTarget();
                  }}
                />
              </ActionRow>
              <View style={styles.toggleRow}>
                <Text style={styles.toggleLabel}>Slideshow</Text>
                <Switch
                  value={slideshowEnabled}
                  onValueChange={(nextValue) => {
                    void handleToggleSlideshow(nextValue);
                  }}
                  disabled={!selectedDevice || sending}
                />
              </View>
            </ManagementCard>

            <ManagementCard title="Switch Profile" subtitle="Apply a profile to the selected device." icon="calendar">
              <ActionRow>
                {profiles.map((profile) => (
                  <ManagementActionButton
                    key={profile.id}
                    label={profile.name}
                    tone="secondary"
                    disabled={!selectedDevice || sending}
                    onPress={() => {
                      void handleSetProfile(profile.id);
                    }}
                  />
                ))}
              </ActionRow>
            </ManagementCard>
          </>
        )}

        {error ? <EmptyPanel variant="error" title="Remote control error" message={error} /> : null}
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundScreen,
  },
  topBar: {
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.sm,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.screenPadding,
    gap: 10,
    paddingBottom: spacing.screenPadding,
  },
  devicesList: {
    flexGrow: 0,
    maxHeight: 260,
  },
  devicesContent: {
    gap: 10,
  },
  toggleRow: {
    marginTop: 6,
    paddingVertical: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  toggleLabel: {
    color: colors.textPrimary,
    fontSize: typography.small.fontSize,
    fontWeight: "600",
  },
});
