import React from "react";
import { Pressable, ScrollView, StyleSheet, Text, View } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { TextInput as AppTextInput } from "../../../shared/ui/components";
import { ConfirmDialog } from "../../../shared/ui/overlays";
import { ErrorState } from "../../../shared/ui/ErrorState";
import {
  ActionRow,
  EmptyPanel,
  FilterChips,
  InlineStatusBadge,
  ManagementActionButton,
  ManagementCard,
  SectionHeader,
} from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import { DeviceCard } from "../../devices/DeviceCard";
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

  // Navigation
  onEnterDisplayMode: () => void;
  onEnterRemoteControlMode: () => void;
  onEnterMarketplace: () => void;
  onLogout: () => void;
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
  onEnterDisplayMode,
  onEnterRemoteControlMode,
  onEnterMarketplace,
  onLogout,
}: SettingsScreenProps) {
  const activeProfile = profiles.find((p) => p.id === activeProfileId);

  return (
    <SafeAreaView style={styles.screen}>
      {/* Settings top bar */}
      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back to editor"
          style={styles.backButton}
          onPress={onBack}
        >
          <Text style={styles.backLabel}>← Back to Editor</Text>
        </Pressable>
        <Text style={styles.topBarTitle}>Settings</Text>
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        <SectionHeader
          icon="settings"
          title="Settings"
          subtitle={`Active profile: ${activeProfile?.name ?? "none"}`}
        />

        {/* Profile Management */}
        <ManagementCard
          title="Profile Management"
          icon="calendar"
          subtitle="Create, rename or switch your display profiles."
          badges={
            activeProfileId ? (
              <InlineStatusBadge label="Active profile selected" tone="info" icon="check" />
            ) : null
          }
        >
          <FilterChips
            items={profiles.map((profile) => ({
              key: profile.id,
              label: profile.name,
              icon: "calendar",
            }))}
            activeKey={activeProfileId}
            onChange={(next) => {
              if (next) {
                onActivateProfile(next);
              }
            }}
          />

          <View style={styles.inlineFields}>
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

          <View style={styles.inlineFields}>
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
            <ManagementActionButton
              label="Delete"
              tone="destructive"
              icon="trash"
              disabled={profiles.length <= 1}
              loading={deletingProfile}
              onPress={() => setConfirmDeleteProfile(true)}
            />
          </View>

          {profileError ? <ErrorState compact message={profileError} /> : null}
        </ManagementCard>

        {/* Device Management */}
        <ManagementCard
          title="Device Management"
          subtitle="Rename devices and remove old registrations."
          icon="grid"
        >
          {loadingDevices ? (
            <EmptyPanel variant="loading" title="Loading devices" message="Fetching registered devices." />
          ) : devices.length === 0 ? (
            <EmptyPanel title="No devices registered" message="Open display mode on a device to register it." />
          ) : (
            <View style={styles.stack}>
              {devices.map((device) => {
                const isCurrentDevice = currentDeviceId === device.id;
                const isRenaming = renamingDeviceId === device.id;
                const isDeleting = deletingDeviceId === device.id;

                return (
                  <DeviceCard key={device.id} device={device} isCurrentDevice={isCurrentDevice}>
                    <View style={styles.inlineFields}>
                      <AppTextInput
                        accessibilityLabel={`Rename device ${device.name}`}
                        style={[styles.textInput, styles.growInput]}
                        value={renameDraftByDeviceId[device.id] ?? ""}
                        onChangeText={(value) => onChangeDeviceNameDraft(device.id, value)}
                        placeholder="Device name"
                      />
                      <ManagementActionButton
                        label="Rename"
                        tone="secondary"
                        loading={isRenaming}
                        onPress={() => onRenameDevice(device.id)}
                      />
                      <ManagementActionButton
                        label="Delete"
                        tone="destructive"
                        icon="trash"
                        disabled={isCurrentDevice}
                        loading={isDeleting}
                        onPress={() => setConfirmDeleteDeviceId(device.id)}
                      />
                    </View>
                  </DeviceCard>
                );
              })}
            </View>
          )}
          {devicesError ? (
            <ErrorState compact message={devicesError} onRetry={onRetryLoadDevices} />
          ) : null}
        </ManagementCard>

        {/* Account & Plan */}
        <ManagementCard
          title="Account & Plan"
          subtitle="Your current subscription and available features."
          icon="star"
          badges={
            <InlineStatusBadge
              label={plan === "pro" ? "Pro" : "Free"}
              tone={plan === "pro" ? "success" : "info"}
            />
          }
        >
          <View style={styles.planRow}>
            <Text style={styles.planName}>
              {plan === "pro" ? "Pro Plan" : "Free Plan"}
            </Text>
            <Text style={styles.planDescription}>
              {plan === "pro"
                ? "You have access to all features including premium widgets."
                : "Upgrade to Pro to unlock premium widgets and advanced features."}
            </Text>
          </View>
          {plan !== "pro" ? (
            <ActionRow>
              <ManagementActionButton
                label="Upgrade to Pro"
                tone="primary"
                icon="star"
                onPress={onUpgradePress}
              />
            </ActionRow>
          ) : null}
        </ManagementCard>

        {/* Navigation */}
        <ManagementCard title="Navigation" subtitle="Switch product modes." icon="chevronRight">
          <ActionRow>
            <ManagementActionButton
              label="Plugin Marketplace"
              tone="primary"
              icon="star"
              onPress={onEnterMarketplace}
            />
            <ManagementActionButton
              label="Display Mode"
              tone="secondary"
              icon="grid"
              onPress={onEnterDisplayMode}
            />
            <ManagementActionButton
              label="Remote Control"
              tone="secondary"
              icon="refresh"
              onPress={onEnterRemoteControlMode}
            />
            <ManagementActionButton
              label="Logout"
              tone="destructive"
              icon="close"
              onPress={onLogout}
            />
          </ActionRow>
        </ManagementCard>
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
    paddingHorizontal: spacing.screenPadding,
    paddingBottom: spacing.xl,
    gap: spacing.md,
    maxWidth: 800,
    alignSelf: "center",
    width: "100%",
  },
  inlineFields: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
    flexWrap: "wrap",
  },
  growInput: {
    flex: 1,
    minWidth: 180,
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
  stack: {
    gap: 10,
  },
  planRow: {
    gap: spacing.xs,
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
});
