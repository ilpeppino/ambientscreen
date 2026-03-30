import type { Profile } from "@ambient/shared-contracts"
import React, { useMemo, useState } from "react"
import {
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from "react-native"
import { SafeAreaView } from "react-native-safe-area-context"
import { useCloudProfiles } from "../../profiles/useCloudProfiles"
import { Button } from "../../../shared/ui/Button"
import { Text } from "../../../shared/ui/components"
import { ErrorState } from "../../../shared/ui/ErrorState"
import { colors, radius, spacing, typography } from "../../../shared/ui/theme"

interface ProfilePickerScreenProps {
  onSelectProfile: (profile: Profile) => void
  onLogout: () => Promise<void>
}

export function ProfilePickerScreen({ onSelectProfile, onLogout }: ProfilePickerScreenProps) {
  const {
    profiles,
    isLoadingProfiles,
    profilesError,
    refreshProfiles,
    activateProfile,
  } = useCloudProfiles()

  const [selectionError, setSelectionError] = useState<string | null>(null)
  const [isSelectingProfileId, setIsSelectingProfileId] = useState<string | null>(null)

  const sortedProfiles = useMemo(
    () => [...profiles].sort((a, b) => Number(b.isDefault) - Number(a.isDefault) || a.name.localeCompare(b.name)),
    [profiles],
  )

  async function handleSelectProfile(profile: Profile) {
    setSelectionError(null)
    setIsSelectingProfileId(profile.id)

    try {
      await activateProfile(profile.id)
      onSelectProfile(profile)
    } catch (error) {
      setSelectionError(error instanceof Error ? error.message : "Failed to open profile")
    } finally {
      setIsSelectingProfileId(null)
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <View style={styles.header}>
        <Text style={styles.title}>Choose a dashboard profile</Text>
        <Text style={styles.subtitle}>Mobile viewer mode only</Text>
      </View>

      {isLoadingProfiles ? (
        <View style={styles.centeredBlock}>
          <Text style={styles.statusLabel}>Loading profiles...</Text>
        </View>
      ) : null}

      {!isLoadingProfiles && profilesError ? (
        <View style={styles.centeredBlock}>
          <ErrorState
            message={profilesError}
            onRetry={() => {
              void refreshProfiles()
            }}
          />
        </View>
      ) : null}

      {!isLoadingProfiles && !profilesError ? (
        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={styles.cardsContainer}
          showsVerticalScrollIndicator={false}
        >
          {sortedProfiles.length === 0 ? (
            <View style={styles.emptyCard}>
              <Text style={styles.emptyTitle}>No profiles yet</Text>
              <Text style={styles.emptySubtitle}>Create profiles from the web admin, then come back here.</Text>
            </View>
          ) : null}

          {sortedProfiles.map((profile) => (
            <Pressable
              key={profile.id}
              accessibilityRole="button"
              accessibilityLabel={`Open profile ${profile.name}`}
              style={styles.profileCard}
              disabled={isSelectingProfileId !== null}
              onPress={() => {
                void handleSelectProfile(profile)
              }}
            >
              <View style={styles.cardHeaderRow}>
                <Text style={styles.profileName}>{profile.name}</Text>
                {profile.isDefault ? <Text style={styles.defaultBadge}>Default</Text> : null}
              </View>
              <Text style={styles.profileMeta}>Slide duration: {profile.defaultSlideDurationSeconds}s</Text>
              <Text style={styles.profileMeta}>Created: {new Date(profile.createdAt).toLocaleDateString()}</Text>
            </Pressable>
          ))}
        </ScrollView>
      ) : null}

      {selectionError ? <Text style={styles.errorText}>{selectionError}</Text> : null}

      <View style={styles.footer}>
        <Button
          label="Sign out"
          variant="secondary"
          onPress={() => {
            void onLogout()
          }}
          fullWidth
        />
      </View>
    </SafeAreaView>
  )
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: colors.backgroundScreen,
    paddingHorizontal: spacing.screenPadding,
  },
  header: {
    paddingTop: spacing.lg,
    paddingBottom: spacing.md,
    gap: spacing.xs,
  },
  title: {
    ...typography.titleMd,
    color: colors.textPrimary,
  },
  subtitle: {
    ...typography.small,
    color: colors.textSecondary,
  },
  centeredBlock: {
    flex: 1,
    justifyContent: "center",
  },
  statusLabel: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  scrollView: {
    flex: 1,
  },
  cardsContainer: {
    gap: spacing.md,
    paddingBottom: spacing.xl,
  },
  profileCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    gap: spacing.xs,
    minHeight: 124,
  },
  cardHeaderRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: spacing.sm,
  },
  profileName: {
    ...typography.titleSm,
    color: colors.textPrimary,
    flexShrink: 1,
  },
  defaultBadge: {
    ...typography.caption,
    color: colors.statusWarningText,
    backgroundColor: colors.statusWarningBg,
    borderWidth: 1,
    borderColor: colors.statusWarningBorder,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.pill,
    overflow: "hidden",
  },
  profileMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  emptyCard: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceCard,
    padding: spacing.lg,
    gap: spacing.xs,
  },
  emptyTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
  },
  emptySubtitle: {
    ...typography.body,
    color: colors.textSecondary,
  },
  footer: {
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
  },
  errorText: {
    ...typography.body,
    color: colors.statusDangerText,
    marginTop: spacing.sm,
  },
})
