import React from "react";
import { StyleSheet, Text, View } from "react-native";
import type { FeatureFlagKey } from "@ambient/shared-contracts";
import { AppIcon } from "../../../shared/ui/components";
import { InlineStatusBadge, ManagementActionButton } from "../../../shared/ui/management";
import { colors, spacing, typography } from "../../../shared/ui/theme";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import type { CreatableWidgetType } from "../adminHome.logic";
import { WidgetLibraryPanel } from "./WidgetLibraryPanel";
import { WidgetPropertiesPanel } from "./WidgetPropertiesPanel";

interface WidgetSidebarProps {
  plan: "free" | "pro";
  hasFeature: (key: FeatureFlagKey) => boolean;
  onUpgradePress: () => void;

  // Library panel
  addingWidgetType: CreatableWidgetType | null;
  onAddWidget: (type: CreatableWidgetType) => void;

  // Properties panel
  selectedWidget: DisplayLayoutWidgetEnvelope | null;
  onSaveConfig: (widgetId: string, config: Record<string, unknown>) => Promise<void>;
}

export function WidgetSidebar({
  plan,
  hasFeature,
  onUpgradePress,
  addingWidgetType,
  onAddWidget,
  selectedWidget,
  onSaveConfig,
}: WidgetSidebarProps) {
  return (
    <View style={styles.sidebar}>
      {/* Widget Library */}
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleRow}>
          <AppIcon name="grid" size="sm" color="textSecondary" />
          <Text style={styles.panelTitle}>Widget Library</Text>
        </View>
        {plan === "free" ? (
          <ManagementActionButton
            label="Upgrade"
            tone="secondary"
            icon="star"
            onPress={onUpgradePress}
          />
        ) : (
          <InlineStatusBadge label="Pro" tone="premium" icon="star" />
        )}
      </View>

      <View style={styles.libraryPanel}>
        <WidgetLibraryPanel
          addingWidgetType={addingWidgetType}
          hasFeature={hasFeature}
          onAddWidget={onAddWidget}
          onUpgradePress={onUpgradePress}
        />
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Properties Inspector */}
      <View style={styles.panelHeader}>
        <View style={styles.panelTitleRow}>
          <AppIcon name="settings" size="sm" color="textSecondary" />
          <Text style={styles.panelTitle}>Properties</Text>
        </View>
        {selectedWidget ? (
          <Text style={styles.panelSubtitle}>{selectedWidget.widgetKey}</Text>
        ) : null}
      </View>

      <View style={styles.propertiesPanel}>
        <WidgetPropertiesPanel
          key={selectedWidget?.widgetInstanceId ?? "none"}
          selectedWidget={selectedWidget}
          onSaveConfig={onSaveConfig}
        />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  sidebar: {
    width: 288,
    backgroundColor: colors.surfaceCard,
    borderRightWidth: 1,
    borderRightColor: colors.border,
    flexDirection: "column",
  },
  panelHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    minHeight: 44,
  },
  panelTitleRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  panelTitle: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  panelSubtitle: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  libraryPanel: {
    height: 260,
    borderBottomWidth: 0,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
  },
  propertiesPanel: {
    flex: 1,
    minHeight: 0,
  },
});
