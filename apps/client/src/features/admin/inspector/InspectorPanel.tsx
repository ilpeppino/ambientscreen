import React from "react";
import { ScrollView, StyleSheet } from "react-native";
import { spacing } from "../../../shared/ui/theme";
import { InspectorHeader } from "./InspectorHeader";
import type { AppIconName } from "../../../shared/ui/components/AppIcon";
import type { InspectorMode } from "./inspector.types";

interface InspectorPanelProps {
  title: string;
  icon?: AppIconName;
  mode: InspectorMode;
  onEdit?: () => void;
  onSave?: () => void;
  onCancel?: () => void;
  saving?: boolean;
  children: React.ReactNode;
}

/**
 * Standalone inspector panel with its own ScrollView.
 * Use this for full-panel inspector views (e.g. modals, dedicated screens).
 * For embedding inside an existing ScrollView, use InspectorRenderer directly.
 */
export function InspectorPanel({
  title,
  icon,
  mode,
  onEdit,
  onSave,
  onCancel,
  saving,
  children,
}: InspectorPanelProps) {
  return (
    <ScrollView
      style={styles.panel}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      <InspectorHeader
        title={title}
        icon={icon}
        mode={mode}
        onEdit={onEdit}
        onSave={onSave}
        onCancel={onCancel}
        saving={saving}
      />
      {children}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
  },
});
