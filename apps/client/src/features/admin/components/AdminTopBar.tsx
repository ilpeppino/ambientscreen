import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Profile } from "@ambient/shared-contracts";
import { AppIcon } from "../../../shared/ui/components";
import { InlineStatusBadge } from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";

interface AdminTopBarProps {
  profiles: Profile[];
  activeProfileId: string | null;
  plan: "free" | "pro";
  onActivateProfile: (id: string) => void;
  onCreateProfile: () => void;
  onManageProfiles: () => void;
  onOpenSettings: () => void;
  onEnterDisplayMode: () => void;
  onEnterRemoteControlMode: () => void;
  onEnterMarketplace: () => void;
  onLogout: () => void;
  onClearCanvas: () => void;
  clearCanvasDisabled?: boolean;
  clearingCanvas?: boolean;
}

export function AdminTopBar({
  profiles,
  activeProfileId,
  plan,
  onActivateProfile,
  onCreateProfile,
  onManageProfiles,
  onOpenSettings,
  onEnterDisplayMode,
  onEnterRemoteControlMode,
  onEnterMarketplace,
  onLogout,
  onClearCanvas,
  clearCanvasDisabled = false,
  clearingCanvas = false,
}: AdminTopBarProps) {
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const activeProfile = profiles.find((p) => p.id === activeProfileId) ?? null;

  function closeAll() {
    setProfileDropdownOpen(false);
    setUserMenuOpen(false);
  }

  return (
    <View style={styles.bar}>
      {/* Dismiss overlay — covers the bar when any dropdown is open */}
      {(profileDropdownOpen || userMenuOpen) ? (
        <Pressable
          style={styles.dismissOverlay}
          onPress={closeAll}
          accessibilityLabel="Close menu"
        />
      ) : null}

      {/* Left: title + profile selector */}
      <View style={styles.left}>
        <Text style={styles.title}>Dashboard Editor</Text>

        <View style={styles.dropdownAnchor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Profile selector"
            style={styles.profileSelector}
            onPress={() => {
              setProfileDropdownOpen((v) => !v);
              setUserMenuOpen(false);
            }}
          >
            <Text style={styles.profileSelectorLabel}>
              {activeProfile?.name ?? "Select profile"}
            </Text>
            <AppIcon name="chevronDown" size="sm" color="textSecondary" />
          </Pressable>

          {profileDropdownOpen ? (
            <View style={styles.dropdown}>
              {profiles.map((profile) => (
                <Pressable
                  key={profile.id}
                  accessibilityRole="button"
                  accessibilityLabel={`Switch to ${profile.name}`}
                  style={[
                    styles.dropdownItem,
                    profile.id === activeProfileId ? styles.dropdownItemActive : null,
                  ]}
                  onPress={() => {
                    onActivateProfile(profile.id);
                    setProfileDropdownOpen(false);
                  }}
                >
                  {profile.id === activeProfileId ? (
                    <AppIcon name="check" size="sm" color="accentBlue" />
                  ) : (
                    <View style={styles.dropdownItemIconSpacer} />
                  )}
                  <Text
                    style={[
                      styles.dropdownItemLabel,
                      profile.id === activeProfileId
                        ? styles.dropdownItemLabelActive
                        : null,
                    ]}
                  >
                    {profile.name}
                  </Text>
                </Pressable>
              ))}

              <View style={styles.dropdownDivider} />

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Create profile"
                style={styles.dropdownItem}
                onPress={() => {
                  onCreateProfile();
                  setProfileDropdownOpen(false);
                }}
              >
                <AppIcon name="plus" size="sm" color="textSecondary" />
                <Text style={styles.dropdownItemLabel}>Create profile</Text>
              </Pressable>

              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Manage profiles"
                style={styles.dropdownItem}
                onPress={() => {
                  onManageProfiles();
                  setProfileDropdownOpen(false);
                }}
              >
                <AppIcon name="settings" size="sm" color="textSecondary" />
                <Text style={styles.dropdownItemLabel}>Manage profiles</Text>
              </Pressable>
            </View>
          ) : null}
        </View>
      </View>

      {/* Right: action groups */}
      <View style={styles.right}>
        {/* Group 1: canvas actions */}
        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Clear Canvas"
            style={[
              styles.ghostButton,
              clearCanvasDisabled ? styles.actionDisabled : null,
            ]}
            onPress={onClearCanvas}
            disabled={clearCanvasDisabled}
          >
            <AppIcon name="trash" size="sm" color="textSecondary" />
            <Text style={styles.ghostButtonLabel}>
              {clearingCanvas ? "Clearing…" : "Clear"}
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Remote Control"
            style={styles.actionButton}
            onPress={onEnterRemoteControlMode}
          >
            <AppIcon name="refresh" size="sm" color="textSecondary" />
            <Text style={styles.actionLabel}>Remote</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Display Mode"
            style={[styles.actionButton, styles.actionButtonPrimary]}
            onPress={onEnterDisplayMode}
          >
            <AppIcon name="grid" size="sm" color="statusInfoText" />
            <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Display</Text>
          </Pressable>
        </View>

        <View style={styles.groupSeparator} />

        {/* Group 2: navigation */}
        <View style={styles.group}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Marketplace"
            style={styles.actionButton}
            onPress={onEnterMarketplace}
          >
            <AppIcon name="star" size="sm" color="textSecondary" />
            <Text style={styles.actionLabel}>Marketplace</Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Settings"
            style={styles.settingsButton}
            onPress={onOpenSettings}
          >
            <AppIcon name="settings" size="sm" color="textPrimary" />
            <Text style={styles.settingsLabel}>Settings</Text>
          </Pressable>
        </View>

        <View style={styles.groupSeparator} />

        {/* Group 3: account */}
        <View style={styles.group}>
          <InlineStatusBadge
            label={plan === "pro" ? "Pro" : "Free"}
            tone={plan === "pro" ? "premium" : "neutral"}
            icon={plan === "pro" ? "star" : "grid"}
          />

          <View style={styles.dropdownAnchor}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="User menu"
              style={styles.actionButton}
              onPress={() => {
                setUserMenuOpen((v) => !v);
                setProfileDropdownOpen(false);
              }}
            >
              <AppIcon name="user" size="sm" color="textSecondary" />
              <AppIcon name="chevronDown" size="sm" color="textSecondary" />
            </Pressable>

            {userMenuOpen ? (
              <View style={[styles.dropdown, styles.dropdownAlignRight]}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Logout"
                  style={styles.dropdownItem}
                  onPress={() => {
                    onLogout();
                    setUserMenuOpen(false);
                  }}
                >
                  <AppIcon name="close" size="sm" color="textSecondary" />
                  <Text style={styles.dropdownItemLabel}>Logout</Text>
                </Pressable>
              </View>
            ) : null}
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    height: 52,
    backgroundColor: colors.surfaceCard,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    gap: spacing.md,
    zIndex: 100,
  },
  dismissOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 10,
  },
  left: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.md,
    zIndex: 20,
  },
  title: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  dropdownAnchor: {
    position: "relative",
    zIndex: 20,
  },
  profileSelector: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
  },
  profileSelectorLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "500",
  },
  dropdown: {
    position: "absolute",
    top: "100%",
    left: 0,
    marginTop: spacing.xs,
    minWidth: 180,
    backgroundColor: colors.surfaceCard,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    zIndex: 200,
  },
  dropdownAlignRight: {
    left: "auto" as unknown as number,
    right: 0,
  },
  dropdownItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dropdownItemActive: {
    backgroundColor: colors.statusInfoBg,
  },
  dropdownItemIconSpacer: {
    width: 16,
    height: 16,
  },
  dropdownItemLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  dropdownItemLabelActive: {
    color: colors.textPrimary,
    fontWeight: "600",
  },
  dropdownDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
    marginHorizontal: spacing.md,
  },
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    zIndex: 20,
  },
  group: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  groupSeparator: {
    width: 1,
    height: 20,
    backgroundColor: colors.border,
    marginHorizontal: spacing.xs,
  },
  ghostButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 7,
  },
  ghostButtonLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  actionButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: colors.buttonPassiveBg,
  },
  actionButtonPrimary: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  actionDisabled: {
    opacity: 0.4,
  },
  actionLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  actionLabelPrimary: {
    color: colors.statusInfoText,
  },
  settingsButton: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.md,
    backgroundColor: colors.surfaceInput,
  },
  settingsLabel: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
