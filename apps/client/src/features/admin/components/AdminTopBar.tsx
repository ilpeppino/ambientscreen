import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { Profile } from "@ambient/shared-contracts";
import { AppIcon } from "../../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";

interface AdminTopBarProps {
  profiles: Profile[];
  activeProfileId: string | null;
  plan: "free" | "pro";
  onActivateProfile: (id: string) => void;
  onCreateProfile: () => void;
  onManageProfiles: () => void;
  onOpenSettings: () => void;
  onUpgradePlan?: () => void;
  onEnterDisplayMode: () => void;
  onEnterRemoteControlMode: () => void;
  onLogout: () => void;
}

export function AdminTopBar({
  profiles,
  activeProfileId,
  plan,
  onActivateProfile,
  onCreateProfile,
  onManageProfiles,
  onOpenSettings,
  onUpgradePlan = () => undefined,
  onEnterDisplayMode,
  onEnterRemoteControlMode,
  onLogout,
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
      {(profileDropdownOpen || userMenuOpen) ? (
        <Pressable
          style={styles.dismissOverlay}
          onPress={closeAll}
          accessibilityLabel="Close menu"
        />
      ) : null}

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

      <View style={styles.right}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Display Mode"
          style={[styles.actionButton, styles.actionButtonPrimary]}
          onPress={onEnterDisplayMode}
        >
          <AppIcon name="grid" size="sm" color="statusInfoText" />
          <Text style={[styles.actionLabel, styles.actionLabelPrimary]}>Display</Text>
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

        <View style={styles.dropdownAnchor}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="User menu"
            style={styles.userButton}
            onPress={() => {
              setUserMenuOpen((v) => !v);
              setProfileDropdownOpen(false);
            }}
          >
            <AppIcon name="user" size="sm" color="textSecondary" />
          </Pressable>

          {userMenuOpen ? (
            <View style={[styles.dropdown, styles.dropdownAlignRight, styles.userMenu]}>
              <View style={styles.menuSection}>
                <Text style={styles.menuSectionLabel}>Account</Text>
                <Text accessibilityLabel="Plan" style={styles.planText}>
                  {plan === "pro" ? "Plan: Pro" : "Plan: Free"}
                </Text>
                {plan === "free" ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Upgrade plan"
                    style={styles.dropdownItem}
                    onPress={() => {
                      onUpgradePlan();
                      setUserMenuOpen(false);
                    }}
                  >
                    <AppIcon name="star" size="sm" color="accent" />
                    <Text style={styles.dropdownItemLabel}>Upgrade</Text>
                  </Pressable>
                ) : null}
              </View>

              <View style={styles.dropdownDivider} />

              <View style={styles.menuSection}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel="Settings"
                  style={styles.dropdownItem}
                  onPress={() => {
                    onOpenSettings();
                    setUserMenuOpen(false);
                  }}
                >
                  <AppIcon name="settings" size="sm" color="textSecondary" />
                  <Text style={styles.dropdownItemLabel}>Settings</Text>
                </Pressable>

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
            </View>
          ) : null}
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
  right: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
  userMenu: {
    minWidth: 220,
  },
  menuSection: {
    paddingVertical: spacing.xs,
  },
  menuSectionLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.7,
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.xs,
  },
  planText: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
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
  actionLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  actionLabelPrimary: {
    color: colors.statusInfoText,
  },
  userButton: {
    alignItems: "center",
    justifyContent: "center",
    minWidth: 34,
    height: 34,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.buttonPassiveBg,
  },
});
