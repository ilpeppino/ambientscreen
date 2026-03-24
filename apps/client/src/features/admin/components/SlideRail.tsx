import React, { useState } from "react";
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { ConfirmDialog, DialogModal } from "../../../shared/ui/overlays";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { SlideRecord } from "../../../services/api/slidesApi";

interface SlideRailProps {
  slides: SlideRecord[];
  activeSlideId: string | null;
  onSelectSlide: (slideId: string) => void;
  onCreateSlide: (name: string) => Promise<void>;
  onDeleteSlide: (slideId: string) => Promise<void>;
  onRenameSlide: (slideId: string, name: string) => Promise<void>;
}

/**
 * Horizontal slide picker strip for the admin editor.
 *
 * Displays each slide as a pressable tab. Provides per-slide controls for
 * rename and delete. An "Add Slide" button creates a new slide.
 */
export function SlideRail({
  slides,
  activeSlideId,
  onSelectSlide,
  onCreateSlide,
  onDeleteSlide,
  onRenameSlide,
}: SlideRailProps) {
  // Create slide dialog
  const [createVisible, setCreateVisible] = useState(false);
  const [newName, setNewName] = useState("");
  const [createError, setCreateError] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);

  // Rename dialog
  const [renameVisible, setRenameVisible] = useState(false);
  const [renameTargetId, setRenameTargetId] = useState<string | null>(null);
  const [renameDraft, setRenameDraft] = useState("");
  const [renameError, setRenameError] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);

  // Delete confirm
  const [deleteTargetId, setDeleteTargetId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const canDelete = slides.length > 1;

  async function handleCreate() {
    const name = newName.trim();
    if (!name) {
      setCreateError("Slide name is required");
      return;
    }
    try {
      setCreating(true);
      setCreateError(null);
      await onCreateSlide(name);
      setNewName("");
      setCreateVisible(false);
    } catch (err) {
      setCreateError(
        err instanceof Error ? err.message : "Failed to create slide",
      );
    } finally {
      setCreating(false);
    }
  }

  async function handleRename() {
    if (!renameTargetId) return;
    const name = renameDraft.trim();
    if (!name) {
      setRenameError("Slide name is required");
      return;
    }
    try {
      setRenaming(true);
      setRenameError(null);
      await onRenameSlide(renameTargetId, name);
      setRenameVisible(false);
      setRenameTargetId(null);
    } catch (err) {
      setRenameError(
        err instanceof Error ? err.message : "Failed to rename slide",
      );
    } finally {
      setRenaming(false);
    }
  }

  async function handleDelete() {
    if (!deleteTargetId) return;
    try {
      setDeleting(true);
      await onDeleteSlide(deleteTargetId);
      setDeleteTargetId(null);
    } catch (err) {
      console.error("Failed to delete slide:", err);
    } finally {
      setDeleting(false);
    }
  }

  const deleteTargetName =
    slides.find((s) => s.id === deleteTargetId)?.name ?? "this slide";

  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.rail}
      >
        {slides.map((slide) => {
          const isActive = slide.id === activeSlideId;
          return (
            <View key={slide.id} style={[styles.tab, isActive && styles.tabActive]}>
              {/* Slide select */}
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`Select slide ${slide.name}`}
                style={styles.tabBody}
                onPress={() => onSelectSlide(slide.id)}
              >
                <Text
                  style={[styles.tabName, isActive && styles.tabNameActive]}
                  numberOfLines={1}
                >
                  {slide.name}
                </Text>
              </Pressable>

              {/* Tab controls */}
              <View style={styles.tabControls}>
                <Pressable
                  accessibilityRole="button"
                  accessibilityLabel={`Rename slide ${slide.name}`}
                  style={styles.tabControl}
                  onPress={() => {
                    setRenameTargetId(slide.id);
                    setRenameDraft(slide.name);
                    setRenameError(null);
                    setRenameVisible(true);
                  }}
                >
                  <Text style={styles.tabControlLabel}>Edit</Text>
                </Pressable>

                {canDelete ? (
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Delete slide ${slide.name}`}
                    style={[styles.tabControl, styles.tabControlDelete]}
                    onPress={() => setDeleteTargetId(slide.id)}
                  >
                    <Text style={styles.tabControlDeleteLabel}>×</Text>
                  </Pressable>
                ) : null}
              </View>
            </View>
          );
        })}

        {/* Add slide button */}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Add slide"
          style={styles.addButton}
          onPress={() => {
            setNewName("");
            setCreateError(null);
            setCreateVisible(true);
          }}
        >
          <Text style={styles.addButtonLabel}>+ Add Slide</Text>
        </Pressable>
      </ScrollView>

      {/* Create dialog */}
      <DialogModal
        visible={createVisible}
        title="New Slide"
        onRequestClose={() => {
          setCreateVisible(false);
          setNewName("");
          setCreateError(null);
        }}
        footer={
          <View style={styles.dialogActions}>
            <Pressable
              accessibilityRole="button"
              style={styles.dialogCancel}
              onPress={() => {
                setCreateVisible(false);
                setNewName("");
                setCreateError(null);
              }}
            >
              <Text style={styles.dialogCancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.dialogConfirm, creating && styles.dialogDisabled]}
              onPress={() => void handleCreate()}
              disabled={creating}
            >
              <Text style={styles.dialogConfirmLabel}>
                {creating ? "Creating…" : "Create"}
              </Text>
            </Pressable>
          </View>
        }
      >
        <View style={styles.dialogBody}>
          <TextInput
            accessibilityLabel="New slide name"
            style={styles.dialogInput}
            value={newName}
            onChangeText={setNewName}
            placeholder="Slide name"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
          {createError ? (
            <Text style={styles.dialogError}>{createError}</Text>
          ) : null}
        </View>
      </DialogModal>

      {/* Rename dialog */}
      <DialogModal
        visible={renameVisible}
        title="Rename Slide"
        onRequestClose={() => {
          setRenameVisible(false);
          setRenameTargetId(null);
          setRenameError(null);
        }}
        footer={
          <View style={styles.dialogActions}>
            <Pressable
              accessibilityRole="button"
              style={styles.dialogCancel}
              onPress={() => {
                setRenameVisible(false);
                setRenameTargetId(null);
                setRenameError(null);
              }}
            >
              <Text style={styles.dialogCancelLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.dialogConfirm, renaming && styles.dialogDisabled]}
              onPress={() => void handleRename()}
              disabled={renaming}
            >
              <Text style={styles.dialogConfirmLabel}>
                {renaming ? "Saving…" : "Save"}
              </Text>
            </Pressable>
          </View>
        }
      >
        <View style={styles.dialogBody}>
          <TextInput
            accessibilityLabel="Slide name"
            style={styles.dialogInput}
            value={renameDraft}
            onChangeText={setRenameDraft}
            placeholder="Slide name"
            placeholderTextColor={colors.textSecondary}
            autoFocus
          />
          {renameError ? (
            <Text style={styles.dialogError}>{renameError}</Text>
          ) : null}
        </View>
      </DialogModal>

      {/* Delete confirm */}
      <ConfirmDialog
        visible={Boolean(deleteTargetId)}
        title="Delete Slide"
        message={`Delete "${deleteTargetName}"?`}
        warningText="Widgets on this slide will be moved to another slide."
        confirmLabel="Delete"
        confirmTone="destructive"
        loading={deleting}
        onConfirm={() => void handleDelete()}
        onCancel={() => setDeleteTargetId(null)}
      />
    </View>
  );
}

const RAIL_HEIGHT = 52;

const styles = StyleSheet.create({
  wrapper: {
    height: RAIL_HEIGHT,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surfaceCard,
  },
  rail: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    minHeight: RAIL_HEIGHT,
  },
  tab: {
    flexDirection: "row",
    alignItems: "center",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.buttonPassiveBg,
    height: 36,
    overflow: "hidden",
  },
  tabActive: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.buttonSecondaryBg,
  },
  tabBody: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    gap: spacing.xs,
    minWidth: 60,
    maxWidth: 140,
  },
  tabName: {
    ...typography.small,
    color: colors.buttonPassiveText,
    fontWeight: "500",
    flexShrink: 1,
  },
  tabNameActive: {
    color: colors.statusInfoText,
  },
  tabControls: {
    flexDirection: "row",
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  tabControl: {
    paddingHorizontal: 7,
    paddingVertical: 6,
    alignItems: "center",
    justifyContent: "center",
  },
  tabControlLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontSize: 11,
  },
  tabControlDelete: {
    borderLeftWidth: 1,
    borderLeftColor: colors.border,
  },
  tabControlDeleteLabel: {
    ...typography.small,
    color: colors.statusDangerText,
    fontSize: 14,
    lineHeight: 16,
  },
  addButton: {
    flexDirection: "row",
    alignItems: "center",
    paddingHorizontal: spacing.sm,
    height: 36,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderStyle: "dashed",
  },
  addButtonLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  // Dialog styles
  dialogBody: {
    gap: spacing.sm,
  },
  dialogInput: {
    ...typography.body,
    color: colors.textPrimary,
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dialogError: {
    ...typography.small,
    color: colors.statusDangerText,
  },
  dialogActions: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: spacing.sm,
  },
  dialogCancel: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  dialogCancelLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  dialogConfirm: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.accentBlue,
    borderRadius: radius.sm,
  },
  dialogDisabled: {
    opacity: 0.55,
  },
  dialogConfirmLabel: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
  },
});
