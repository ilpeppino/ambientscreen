import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import type { Device } from "@ambient/shared-contracts";
import { getDevices, sendDeviceCommand } from "../../../services/api/devicesApi";
import { useCloudProfiles } from "../../profiles/useCloudProfiles";

interface RemoteControlScreenProps {
  currentDeviceId: string | null;
  onBack: () => void;
}

function formatPresence(device: Device): string {
  const explicitStatus = device.connectionStatus;
  if (explicitStatus === "online") {
    return "online";
  }

  if (explicitStatus === "offline") {
    return "offline";
  }

  const lastSeenDate = new Date(device.lastSeenAt);
  if (Number.isNaN(lastSeenDate.getTime())) {
    return "unknown";
  }

  const isLikelyOnline = Date.now() - lastSeenDate.getTime() < 5 * 60 * 1000;
  return isLikelyOnline ? "online" : "offline";
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
    <View style={styles.screen}>
      <View style={styles.headerRow}>
        <Text style={styles.title}>Remote Control</Text>
        <Pressable onPress={onBack} style={styles.backButton}>
          <Text style={styles.backLabel}>Back</Text>
        </Pressable>
      </View>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#fff" />
          <Text style={styles.hint}>Loading devices...</Text>
        </View>
      ) : (
        <>
          <Text style={styles.sectionTitle}>Target Device</Text>
          <ScrollView style={styles.devicesList}>
            {devices.length === 0 ? <Text style={styles.hint}>No devices found.</Text> : null}
            {devices.map((device) => {
              const selected = device.id === selectedDeviceId;
              const status = formatPresence(device);

              return (
                <Pressable
                  key={device.id}
                  onPress={() => setSelectedDeviceId(device.id)}
                  style={[styles.deviceItem, selected ? styles.deviceItemSelected : null]}
                >
                  <Text style={styles.deviceName}>{device.name}</Text>
                  <Text style={styles.deviceMeta}>
                    {device.platform} / {device.deviceType} / {status}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

          <Text style={styles.sectionTitle}>Actions</Text>
          <Pressable
            disabled={!selectedDevice || sending}
            onPress={() => {
              void handleRefreshTarget();
            }}
            style={[styles.actionButton, (!selectedDevice || sending) ? styles.actionButtonDisabled : null]}
          >
            <Text style={styles.actionButtonLabel}>{sending ? "Sending..." : "Refresh target"}</Text>
          </Pressable>

          <View style={styles.slideshowRow}>
            <Text style={styles.actionLabel}>Slideshow</Text>
            <Switch
              value={slideshowEnabled}
              onValueChange={(nextValue) => {
                void handleToggleSlideshow(nextValue);
              }}
              disabled={!selectedDevice || sending}
            />
          </View>

          <Text style={styles.sectionTitle}>Switch Profile</Text>
          <View style={styles.profileButtons}>
            {profiles.map((profile) => (
              <Pressable
                key={profile.id}
                disabled={!selectedDevice || sending}
                onPress={() => {
                  void handleSetProfile(profile.id);
                }}
                style={[styles.profileButton, (!selectedDevice || sending) ? styles.actionButtonDisabled : null]}
              >
                <Text style={styles.profileButtonLabel}>{profile.name}</Text>
              </Pressable>
            ))}
          </View>
        </>
      )}

      {selectedDevice ? <Text style={styles.hint}>Controlling: {selectedDevice.name}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#05070d",
    padding: 20,
    gap: 12,
  },
  headerRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: {
    color: "#fff",
    fontSize: 30,
    fontWeight: "700",
  },
  backButton: {
    backgroundColor: "#1c2535",
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 10,
  },
  backLabel: {
    color: "#fff",
    fontSize: 14,
    fontWeight: "600",
  },
  sectionTitle: {
    color: "#d7deea",
    fontSize: 16,
    fontWeight: "700",
    marginTop: 8,
  },
  devicesList: {
    maxHeight: 220,
  },
  deviceItem: {
    padding: 12,
    borderRadius: 10,
    backgroundColor: "#0f1724",
    marginBottom: 8,
  },
  deviceItemSelected: {
    borderWidth: 1,
    borderColor: "#69a8ff",
  },
  deviceName: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "600",
  },
  deviceMeta: {
    color: "#95a4be",
    fontSize: 13,
    marginTop: 4,
  },
  actionButton: {
    backgroundColor: "#2e67c8",
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.55,
  },
  actionButtonLabel: {
    color: "#fff",
    fontSize: 15,
    fontWeight: "700",
  },
  actionLabel: {
    color: "#d7deea",
    fontSize: 15,
    fontWeight: "600",
  },
  slideshowRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: "#0f1724",
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  profileButtons: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 8,
  },
  profileButton: {
    backgroundColor: "#20314a",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  profileButtonLabel: {
    color: "#fff",
    fontSize: 13,
    fontWeight: "600",
  },
  error: {
    color: "#ff7b7b",
    fontSize: 14,
  },
  hint: {
    color: "#95a4be",
    fontSize: 13,
  },
  loadingContainer: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 10,
  },
});
