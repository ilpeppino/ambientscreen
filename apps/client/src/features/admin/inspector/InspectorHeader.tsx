import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import { Text } from "../../../shared/ui/components/Text";
import { AppIcon } from "../../../shared/ui/components";
import type { AppIconName } from "../../../shared/ui/components/AppIcon";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { InspectorMode } from "./inspector.types";

interface InspectorHeaderProps {
  title: string;
  /** Widget icon. Must NOT show widget ID. */
  icon?: AppIconName;
  mode: InspectorMode;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
}

/**
 * Inspector panel header.
 * Displays widget icon and name only — never the widget ID.
 */
export function InspectorHeader({
  title,
  icon,
  mode,
  onEdit,
  onSave,
  onCancel,
  saving,
}: InspectorHeaderProps) {
  return (
    <View style={styles.header}>
      {icon ? (
        <View style={styles.iconWrap}>
          <AppIcon name={icon} size="sm" color="textSecondary" />
        </View>
      ) : null}

      <Text style={styles.title} numberOfLines={1}>
        {title}
      </Text>

      <View style={styles.actions}>
        {mode === "edit" ? (
          <>
            <Pressable
              style={styles.iconButton}
              onPress={onSave}
              disabled={saving}
              accessibilityLabel="Save"
            >
              <AppIcon
                name="check"
                size="sm"
                color={saving ? "textSecondary" : "textPrimary"}
              />
            </Pressable>
            <Pressable
              style={styles.iconButton}
              onPress={onCancel}
              disabled={saving}
              accessibilityLabel="Cancel"
            >
              <AppIcon name="close" size="sm" color="textSecondary" />
            </Pressable>
          </>
        ) : onEdit ? (
          <Pressable
            style={styles.iconButton}
            onPress={onEdit}
            accessibilityLabel="Edit"
          >
            <AppIcon name="pencil" size="sm" color="textSecondary" />
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  iconWrap: {
    width: 32,
    height: 32,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  title: {
    flex: 1,
    ...typography.caption,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  actions: {
    flexDirection: "row",
    gap: spacing.xs,
  },
  iconButton: {
    width: 28,
    height: 28,
    alignItems: "center",
    justifyContent: "center",
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.border,
  },
});
