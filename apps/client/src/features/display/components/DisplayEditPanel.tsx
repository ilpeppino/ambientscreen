import React from "react";
import { Pressable, StyleSheet, Switch, Text, View } from "react-native";
import type { Profile } from "@ambient/shared-contracts";
import type { SharedScreenSession } from "@ambient/shared-contracts";
import type { SharedSessionConnectionState } from "../services/sharedSessionClient";
import { TextInput as AppTextInput } from "../../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import {
  WidgetHeader,
  WidgetSurface,
} from "../../../shared/ui/widgets";

interface DisplayEditPanelProps {
  // Shared session
  isSharedMode: boolean;
  sharedSession: SharedScreenSession | null;
  availableSessions: SharedScreenSession[];
  sharedSessionConnectionState: SharedSessionConnectionState;
  loadingSharedSessions: boolean;
  loadingSharedSessionState: boolean;
  newSharedSessionName: string;
  setNewSharedSessionName: (name: string) => void;
  onRefreshSessions: () => void;
  onCreateAndJoinSession: (name: string) => void;
  onJoinSessionById: (sessionId: string) => void;
  onLeaveSession: () => void;
  onPatchSession: (patch: { activeProfileId?: string | null }) => void;

  // Profiles
  profiles: Profile[];
  effectiveActiveProfileId: string | null | undefined;
  onSetActiveProfile: (profileId: string) => void;

  // Slideshow
  slideshowEnabled: boolean;
  setSlideshowEnabled: (enabled: boolean) => void;
  slideshowProfileIds: string[];
  slideshowIntervalSecInput: string;
  setSlideshowIntervalSecInput: (value: string) => void;
  slideshowSaveError: string | null;
  savingSlideshow: boolean;
  onToggleSlideshowProfileId: (profileId: string) => void;
  onSaveSlideshow: () => void;

  // Edit mode
  editMode: boolean;
  onToggleEditMode: () => void;
}

export function DisplayEditPanel({
  isSharedMode,
  sharedSession,
  availableSessions,
  sharedSessionConnectionState,
  loadingSharedSessions,
  loadingSharedSessionState,
  newSharedSessionName,
  setNewSharedSessionName,
  onRefreshSessions,
  onCreateAndJoinSession,
  onJoinSessionById,
  onLeaveSession,
  onPatchSession,
  profiles,
  effectiveActiveProfileId,
  onSetActiveProfile,
  slideshowEnabled,
  setSlideshowEnabled,
  slideshowProfileIds,
  slideshowIntervalSecInput,
  setSlideshowIntervalSecInput,
  slideshowSaveError,
  savingSlideshow,
  onToggleSlideshowProfileId,
  onSaveSlideshow,
  editMode,
  onToggleEditMode,
}: DisplayEditPanelProps) {
  return (
    <View style={styles.container}>
      <WidgetSurface mode="edit" style={styles.sharedSessionPanel}>
        <WidgetHeader mode="edit" icon="grid" title="Shared Session" />
        <View style={styles.sharedSessionRow}>
          <Text style={styles.sharedSessionLabel}>
            {isSharedMode
              ? `Shared: ${sharedSession!.name}`
              : "Shared session: off"}
          </Text>
          <Pressable
            accessibilityRole="button"
            style={styles.sharedSessionRefreshButton}
            onPress={onRefreshSessions}
          >
            <Text style={styles.sharedSessionRefreshLabel}>Refresh</Text>
          </Pressable>
          {isSharedMode ? (
            <Pressable
              accessibilityRole="button"
              style={styles.sharedSessionLeaveButton}
              onPress={onLeaveSession}
            >
              <Text style={styles.sharedSessionLeaveLabel}>Leave</Text>
            </Pressable>
          ) : null}
        </View>
        {!isSharedMode ? (
          <View style={styles.sharedSessionRow}>
            <AppTextInput
              value={newSharedSessionName}
              onChangeText={setNewSharedSessionName}
              inputStyle={styles.sharedSessionNameInput}
              placeholder="Session name"
              placeholderTextColor={colors.textSecondary}
            />
            <Pressable
              accessibilityRole="button"
              style={styles.sharedSessionCreateButton}
              onPress={() => {
                onCreateAndJoinSession(newSharedSessionName);
              }}
            >
              <Text style={styles.sharedSessionCreateLabel}>Create & Join</Text>
            </Pressable>
          </View>
        ) : null}
        <View style={styles.sharedSessionSessionsRow}>
          {availableSessions.map((session) => {
            const selected = session.id === sharedSession?.id;
            return (
              <Pressable
                key={session.id}
                accessibilityRole="button"
                style={[styles.sharedSessionChip, selected ? styles.sharedSessionChipActive : null]}
                onPress={() => {
                  onJoinSessionById(session.id);
                }}
              >
                <Text style={styles.sharedSessionChipLabel}>
                  {session.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <Text style={styles.sharedSessionMeta}>
          Connection: {sharedSessionConnectionState}
          {loadingSharedSessions || loadingSharedSessionState ? " • syncing..." : ""}
        </Text>
      </WidgetSurface>

      <View style={styles.profileTabsRow}>
        {profiles.map((profile) => {
          const selected = profile.id === effectiveActiveProfileId;
          return (
            <Pressable
              key={profile.id}
              accessibilityRole="button"
              style={[styles.profileTab, selected ? styles.profileTabSelected : null]}
              onPress={() => {
                if (isSharedMode) {
                  onPatchSession({ activeProfileId: profile.id });
                  return;
                }

                onSetActiveProfile(profile.id);
              }}
            >
              <Text style={[styles.profileTabLabel, selected ? styles.profileTabLabelSelected : null]}>
                {profile.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <WidgetSurface mode="edit" style={styles.slideshowPanel}>
        <WidgetHeader mode="edit" icon="refresh" title="Slideshow" />
        <View style={styles.slideshowRow}>
          <Text style={styles.slideshowLabel}>Enabled</Text>
          <Switch
            value={slideshowEnabled}
            onValueChange={setSlideshowEnabled}
            disabled={profiles.length < 2}
          />
        </View>
        <View style={styles.slideshowProfileRow}>
          {profiles.map((profile) => {
            const selected = slideshowProfileIds.includes(profile.id);
            return (
              <Pressable
                key={`${profile.id}-slideshow`}
                accessibilityRole="button"
                style={[styles.slideshowProfileChip, selected ? styles.slideshowProfileChipSelected : null]}
                onPress={() => {
                  onToggleSlideshowProfileId(profile.id);
                }}
              >
                <Text style={[styles.slideshowProfileChipLabel, selected ? styles.slideshowProfileChipLabelSelected : null]}>
                  {profile.name}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.slideshowRow}>
          <Text style={styles.slideshowLabel}>Interval (s)</Text>
          <AppTextInput
            value={slideshowIntervalSecInput}
            onChangeText={setSlideshowIntervalSecInput}
            keyboardType="numeric"
            inputStyle={styles.slideshowIntervalInput}
            placeholder="60"
            placeholderTextColor={colors.textSecondary}
          />
          <Pressable
            accessibilityRole="button"
            style={[styles.slideshowSaveButton, savingSlideshow ? styles.slideshowSaveButtonDisabled : null]}
            onPress={onSaveSlideshow}
            disabled={savingSlideshow}
          >
            <Text style={styles.slideshowSaveButtonLabel}>{savingSlideshow ? "Saving..." : "Save"}</Text>
          </Pressable>
        </View>
        {slideshowSaveError ? <Text style={styles.slideshowError}>{slideshowSaveError}</Text> : null}
      </WidgetSurface>

      <Pressable
        accessibilityRole="button"
        style={[styles.editModeButton, editMode ? styles.editModeButtonActive : null]}
        onPress={onToggleEditMode}
      >
        <Text style={styles.editModeButtonLabel}>{editMode ? "Done Editing" : "Edit Layout"}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    top: 18,
    right: 130,
    zIndex: 20,
  },
  sharedSessionPanel: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
    minWidth: 360,
    marginBottom: spacing.sm,
    gap: spacing.sm,
  },
  sharedSessionRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  sharedSessionLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
    flex: 1,
  },
  sharedSessionRefreshButton: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  sharedSessionRefreshLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  sharedSessionLeaveButton: {
    borderWidth: 1,
    borderColor: colors.statusDangerBorder,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: "rgba(57, 16, 16, 0.92)",
  },
  sharedSessionLeaveLabel: {
    color: colors.statusDangerText,
    fontSize: 11,
    fontWeight: "700",
  },
  sharedSessionNameInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: typography.caption.fontSize,
    backgroundColor: "rgba(9, 9, 9, 0.9)",
  },
  sharedSessionCreateButton: {
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 7,
    backgroundColor: "rgba(12, 42, 66, 0.92)",
  },
  sharedSessionCreateLabel: {
    color: colors.statusInfoText,
    fontSize: 11,
    fontWeight: "700",
  },
  sharedSessionSessionsRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.sm,
  },
  sharedSessionChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  sharedSessionChipActive: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  sharedSessionChipLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  sharedSessionMeta: {
    color: colors.textSecondary,
    fontSize: 11,
  },
  profileTabsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    marginBottom: 10,
    justifyContent: "flex-end",
    flexWrap: "wrap",
  },
  profileTab: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    backgroundColor: "rgba(0, 0, 0, 0.82)",
  },
  profileTabSelected: {
    borderColor: colors.textPrimary,
    backgroundColor: "rgba(30, 30, 30, 0.95)",
  },
  profileTabLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  profileTabLabelSelected: {
    color: colors.textPrimary,
  },
  slideshowPanel: {
    borderColor: colors.border,
    borderRadius: radius.lg,
    padding: 10,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    minWidth: 360,
  },
  slideshowRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginBottom: spacing.sm,
  },
  slideshowLabel: {
    color: colors.textSecondary,
    fontSize: typography.caption.fontSize,
    fontWeight: "600",
  },
  slideshowProfileRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
    marginBottom: spacing.sm,
  },
  slideshowProfileChip: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.pill,
    paddingHorizontal: 10,
    paddingVertical: 5,
  },
  slideshowProfileChipSelected: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  slideshowProfileChipLabel: {
    color: colors.textSecondary,
    fontSize: 11,
    fontWeight: "600",
  },
  slideshowProfileChipLabelSelected: {
    color: colors.statusInfoText,
  },
  slideshowIntervalInput: {
    width: 90,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.sm,
    color: colors.textPrimary,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: typography.caption.fontSize,
    backgroundColor: "rgba(9, 9, 9, 0.9)",
  },
  slideshowSaveButton: {
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: radius.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: 7,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  slideshowSaveButtonDisabled: {
    opacity: 0.6,
  },
  slideshowSaveButtonLabel: {
    color: colors.statusInfoText,
    fontSize: 11,
    fontWeight: "700",
  },
  slideshowError: {
    color: colors.error,
    fontSize: 11,
  },
  editModeButton: {
    marginTop: spacing.sm,
    borderWidth: 1,
    borderColor: colors.accentBlue,
    borderRadius: radius.pill,
    paddingHorizontal: 14,
    paddingVertical: 9,
    backgroundColor: "rgba(12, 30, 45, 0.9)",
  },
  editModeButtonActive: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(20, 52, 82, 0.95)",
  },
  editModeButtonLabel: {
    color: colors.statusInfoText,
    fontSize: typography.caption.fontSize,
    letterSpacing: 0.4,
    fontWeight: "600",
  },
});
