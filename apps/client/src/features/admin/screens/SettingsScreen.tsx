import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { useDevSettings } from "../../../core/devSettings/devSettings.context";
import { TextInput as AppTextInput } from "../../../shared/ui/components";
import { AppIcon } from "../../../shared/ui/components";
import { ConfirmDialog } from "../../../shared/ui/overlays";
import { ErrorState } from "../../../shared/ui/ErrorState";
import {
  EmptyPanel,
  FilterChips,
  InlineStatusBadge,
  ManagementActionButton,
} from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { Device, UserPlan } from "@ambient/shared-contracts";
import type { Profile } from "@ambient/shared-contracts";

interface SettingsScreenProps {
  onBack: () => void;

  // Account & plan
  plan: UserPlan;
  onUpgradePress: () => void;

  // Profile management
  profiles: Profile[];
  activeProfileId: string | null;
  profileError: string | null;
  newProfileName: string;
  setNewProfileName: (val: string) => void;
  renameProfileName: string;
  setRenameProfileName: (val: string) => void;
  creatingProfile: boolean;
  renamingProfile: boolean;
  deletingProfile: boolean;
  confirmDeleteProfile: boolean;
  setConfirmDeleteProfile: (val: boolean) => void;
  onActivateProfile: (id: string) => void;
  onCreateProfile: () => void;
  onRenameProfile: () => void;
  onDeleteProfile: () => void;
  slideDurationInput: string;
  setSlideDurationInput: (value: string) => void;
  slideDurationError: string | null;
  savingSlideDuration: boolean;
  onSaveSlideDuration: () => void;

  // Device management
  devices: Device[];
  loadingDevices: boolean;
  devicesError: string | null;
  currentDeviceId: string | null;
  renameDraftByDeviceId: Record<string, string>;
  onChangeDeviceNameDraft: (deviceId: string, value: string) => void;
  renamingDeviceId: string | null;
  deletingDeviceId: string | null;
  confirmDeleteDeviceId: string | null;
  setConfirmDeleteDeviceId: (id: string | null) => void;
  onRenameDevice: (deviceId: string) => void;
  onDeleteDevice: (deviceId: string) => void;
  onRetryLoadDevices: () => void;
}

function devicePresence(device: Device): "online" | "offline" {
  if (device.connectionStatus === "online") return "online";
  if (device.connectionStatus === "offline") return "offline";
  const lastSeen = new Date(device.lastSeenAt).getTime();
  return !Number.isNaN(lastSeen) && Date.now() - lastSeen < 5 * 60 * 1000
    ? "online"
    : "offline";
}

function formatLastSeen(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "Unknown" : date.toLocaleString();
}

export function SettingsScreen({
  onBack,
  plan,
  onUpgradePress,
  profiles,
  activeProfileId,
  profileError,
  newProfileName,
  setNewProfileName,
  renameProfileName,
  setRenameProfileName,
  creatingProfile,
  renamingProfile,
  deletingProfile,
  confirmDeleteProfile,
  setConfirmDeleteProfile,
  onActivateProfile,
  onCreateProfile,
  onRenameProfile,
  onDeleteProfile,
  slideDurationInput,
  setSlideDurationInput,
  slideDurationError,
  savingSlideDuration,
  onSaveSlideDuration,
  devices,
  loadingDevices,
  devicesError,
  currentDeviceId,
  renameDraftByDeviceId,
  onChangeDeviceNameDraft,
  renamingDeviceId,
  deletingDeviceId,
  confirmDeleteDeviceId,
  setConfirmDeleteDeviceId,
  onRenameDevice,
  onDeleteDevice,
  onRetryLoadDevices,
}: SettingsScreenProps) {
  const activeProfile = profiles.find((p) => p.id === activeProfileId);
  const [expandProfileActions, setExpandProfileActions] = useState(false);
  const [renameOpenDeviceId, setRenameOpenDeviceId] = useState<string | null>(null);
  const { settings: devSettings, update: updateDevSettings } = useDevSettings();

  return (
    <SafeAreaView style={styles.screen}>
      {/* Top bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to editor"
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backLabel}>← Back</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>

        {/* ── Section 1: Profile ─────────────────────────────────── */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <Text style={styles.sectionTitle}>Profile</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage profiles"
              onPress={() => setExpandProfileActions((v) => !v)}
            >
              <Text style={styles.textButton}>
                {expandProfileActions ? "Done" : "Manage profiles"}
              </Text>
            </Pressable>
          </View>

          {/* Active profile highlight */}
          {activeProfile ? (
            <View style={styles.activeProfileRow}>
              <Text style={styles.activeProfileName}>{activeProfile.name}</Text>
              <InlineStatusBadge label="Active" tone="neutral" />
            </View>
          ) : (
            <Text style={styles.noProfileText}>No profile selected</Text>
          )}

          <View style={styles.inlineRow}>
            <Text style={styles.durationLabel}>Slide duration</Text>
            <AppTextInput
              accessibilityLabel="Default slide duration seconds"
              style={styles.durationInput}
              value={slideDurationInput}
              onChangeText={setSlideDurationInput}
              placeholder="30"
              keyboardType="numeric"
            />
            <Text style={styles.durationUnit}>seconds</Text>
            <ManagementActionButton
              label="Save"
              tone="secondary"
              loading={savingSlideDuration}
              onPress={onSaveSlideDuration}
            />
          </View>
          {slideDurationError ? <ErrorState compact message={slideDurationError} /> : null}

          {/* Collapsible profile management */}
          {expandProfileActions ? (
            <View style={styles.profileActions}>
              {profiles.length > 1 ? (
                <FilterChips
                  items={profiles.map((p) => ({ key: p.id, label: p.name, icon: "calendar" }))}
                  activeKey={activeProfileId}
                  onChange={(next) => { if (next) onActivateProfile(next); }}
                />
              ) : null}

              <View style={styles.separator} />

              <View style={styles.inlineRow}>
                <AppTextInput
                  accessibilityLabel="New profile name"
                  style={[styles.textInput, styles.growInput]}
                  value={newProfileName}
                  onChangeText={setNewProfileName}
                  placeholder="New profile name"
                />
                <ManagementActionButton
                  label="Create"
                  tone="primary"
                  icon="plus"
                  loading={creatingProfile}
                  onPress={onCreateProfile}
                />
              </View>

              <View style={styles.inlineRow}>
                <AppTextInput
                  accessibilityLabel="Rename active profile"
                  style={[styles.textInput, styles.growInput]}
                  value={renameProfileName}
                  onChangeText={setRenameProfileName}
                  placeholder="Rename active profile"
                />
                <ManagementActionButton
                  label="Rename"
                  tone="secondary"
                  loading={renamingProfile}
                  onPress={onRenameProfile}
                />
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Delete active profile"
                  style={[styles.iconButton, profiles.length <= 1 ? styles.iconButtonDisabled : null]}
                  disabled={profiles.length <= 1}
                  onPress={() => setConfirmDeleteProfile(true)}
                >
                  <AppIcon name="trash" size="sm" color="error" />
                </Pressable>
              </View>

              {profileError ? <ErrorState compact message={profileError} /> : null}
            </View>
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* ── Section 2: Devices ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Devices</Text>

          {loadingDevices ? (
            <EmptyPanel variant="loading" title="Loading devices" message="Fetching registered devices." />
          ) : devices.length === 0 ? (
            <EmptyPanel title="No devices" message="Open display mode on a device to register it." />
          ) : (
            <View style={styles.deviceList}>
              {devices.map((device) => {
                const isCurrentDevice = currentDeviceId === device.id;
                const isRenaming = renamingDeviceId === device.id;
                const isDeleting = deletingDeviceId === device.id;
                const presence = devicePresence(device);
                const renameOpen = renameOpenDeviceId === device.id;

                return (
                  <View key={device.id} style={styles.deviceRow}>
                    <View style={styles.deviceMain}>
                      <View style={styles.deviceInfo}>
                        <Text style={styles.deviceName}>{device.name}</Text>
                        <Text style={styles.deviceType}>
                          {device.platform} · {device.deviceType}
                        </Text>
                        <Text style={styles.deviceLastSeen}>
                          Last seen: {formatLastSeen(device.lastSeenAt)}
                        </Text>
                      </View>
                      <View style={styles.deviceBadges}>
                        <InlineStatusBadge label={presence} tone="neutral" />
                        {isCurrentDevice ? (
                          <InlineStatusBadge label="This device" tone="neutral" />
                        ) : null}
                      </View>
                    </View>

                    <View style={styles.deviceActions}>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Rename device ${device.name}`}
                        onPress={() =>
                          setRenameOpenDeviceId(renameOpen ? null : device.id)
                        }
                      >
                        <Text style={styles.textButton}>Rename</Text>
                      </Pressable>
                      <Pressable
                        accessibilityRole="button"
                        accessibilityLabel={`Delete device ${device.name}`}
                        style={[styles.iconButton, (isCurrentDevice || isDeleting) ? styles.iconButtonDisabled : null]}
                        disabled={isCurrentDevice || isDeleting}
                        onPress={() => setConfirmDeleteDeviceId(device.id)}
                      >
                        <AppIcon name="trash" size="sm" color="error" />
                      </Pressable>
                    </View>

                    {renameOpen ? (
                      <View style={styles.inlineRow}>
                        <AppTextInput
                          accessibilityLabel={`New name for device ${device.name}`}
                          style={[styles.textInput, styles.growInput]}
                          value={renameDraftByDeviceId[device.id] ?? ""}
                          onChangeText={(value) => onChangeDeviceNameDraft(device.id, value)}
                          placeholder="Device name"
                        />
                        <ManagementActionButton
                          label="Save"
                          tone="secondary"
                          loading={isRenaming}
                          onPress={() => {
                            onRenameDevice(device.id);
                            setRenameOpenDeviceId(null);
                          }}
                        />
                      </View>
                    ) : null}
                  </View>
                );
              })}
            </View>
          )}

          {devicesError ? (
            <ErrorState compact message={devicesError} onRetry={onRetryLoadDevices} />
          ) : null}
        </View>

        <View style={styles.divider} />

        {/* ── Section 3: Account ────────────────────────────────── */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>
          <Text style={styles.planName}>
            {plan === "pro" ? "Pro Plan" : "Free Plan"}
          </Text>
          <Text style={styles.planDescription}>
            {plan === "pro"
              ? "You have access to all features including premium widgets."
              : "Upgrade to Pro to unlock premium widgets and advanced features."}
          </Text>
          {plan !== "pro" ? (
            <ManagementActionButton
              label="Upgrade to Pro"
              tone="primary"
              icon="star"
              onPress={onUpgradePress}
            />
          ) : null}
        </View>

        {/* ── Section 4: Developer (dev builds only) ─────────── */}
        {__DEV__ ? (
          <>
            <View style={styles.divider} />
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Developer</Text>
              <View style={styles.devToggleRow}>
                <View style={styles.devToggleInfo}>
                  <Text style={styles.devToggleLabel}>Debug lines in edit mode</Text>
                  <Text style={styles.devToggleDescription}>
                    Shows an on-screen legend to toggle region, content, and grid overlays while in edit mode.
                  </Text>
                </View>
                <Switch
                  value={devSettings.debugOverlayEnabled}
                  onValueChange={(v) => updateDevSettings({ debugOverlayEnabled: v })}
                  trackColor={{ false: colors.border, true: colors.accentBlue }}
                  thumbColor={colors.textPrimary}
                />
              </View>
            </View>
          </>
        ) : null}

      </ScrollView>

      <ConfirmDialog
        visible={confirmDeleteProfile}
        title="Delete Profile"
        message="Are you sure you want to delete the active profile?"
        warningText="This cannot be undone. All widgets in this profile will be permanently removed."
        confirmLabel="Delete"
        loading={deletingProfile}
        onConfirm={() => {
          setConfirmDeleteProfile(false);
          onDeleteProfile();
        }}
        onCancel={() => setConfirmDeleteProfile(false)}
      />

      <ConfirmDialog
        visible={confirmDeleteDeviceId !== null}
        title="Delete Device"
        message="Are you sure you want to remove this device registration?"
        warningText="This cannot be undone."
        confirmLabel="Delete"
        loading={confirmDeleteDeviceId !== null && deletingDeviceId === confirmDeleteDeviceId}
        onConfirm={() => {
          const id = confirmDeleteDeviceId;
          setConfirmDeleteDeviceId(null);
          if (id) {
            onDeleteDevice(id);
          }
        }}
        onCancel={() => setConfirmDeleteDeviceId(null)}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundScreen,
  },
  topBar: {
    height: 52,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.lg,
  },
  backButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInput,
  },
  backLabel: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  topBarTitle: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  scroll: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: spacing.xl,
    maxWidth: 700,
    alignSelf: "center",
    width: "100%",
  },
  section: {
    paddingHorizontal: spacing.screenPadding,
    paddingVertical: spacing.lg,
    gap: spacing.md,
  },
  sectionTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: "700",
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  textButton: {
    ...typography.small,
    color: colors.accentBlue,
    fontWeight: "600",
  },
  activeProfileRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  activeProfileName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  noProfileText: {
    ...typography.small,
    color: colors.textSecondary,
  },
  durationLabel: {
    ...typography.small,
    color: colors.textSecondary,
    minWidth: 92,
  },
  durationInput: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.body.fontSize,
    minWidth: 80,
    maxWidth: 96,
  },
  durationUnit: {
    ...typography.small,
    color: colors.textSecondary,
  },
  profileActions: {
    gap: spacing.sm,
  },
  separator: {
    height: 1,
    backgroundColor: colors.border,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: spacing.screenPadding,
  },
  inlineRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    flexWrap: "wrap",
  },
  growInput: {
    flex: 1,
    minWidth: 160,
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.body.fontSize,
  },
  iconButton: {
    padding: spacing.sm,
    borderRadius: radius.sm,
  },
  iconButtonDisabled: {
    opacity: 0.35,
  },
  deviceList: {
    gap: spacing.md,
  },
  deviceRow: {
    gap: spacing.sm,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  deviceMain: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.md,
  },
  deviceInfo: {
    flex: 1,
    gap: 2,
  },
  deviceName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  deviceType: {
    ...typography.small,
    color: colors.textSecondary,
  },
  deviceLastSeen: {
    fontSize: 11,
    color: colors.textSecondary,
    opacity: 0.7,
  },
  deviceBadges: {
    flexDirection: "row",
    gap: spacing.xs,
    flexWrap: "wrap",
    justifyContent: "flex-end",
  },
  deviceActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  planName: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  planDescription: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 20,
  },
  devToggleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
  },
  devToggleInfo: {
    flex: 1,
    gap: 3,
  },
  devToggleLabel: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  devToggleDescription: {
    ...typography.small,
    color: colors.textSecondary,
    lineHeight: 18,
  },
});
