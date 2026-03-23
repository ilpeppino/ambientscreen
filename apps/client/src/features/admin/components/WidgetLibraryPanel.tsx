import React, { useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { FeatureFlagKey, WidgetKey } from "@ambient/shared-contracts";
import { AppIcon } from "../../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { CreatableWidgetType } from "../adminHome.logic";
import { CREATABLE_WIDGET_TYPES } from "../adminHome.logic";

const WIDGET_ICON: Record<WidgetKey, "clock" | "weather" | "calendar"> = {
  clockDate: "clock",
  weather: "weather",
  calendar: "calendar",
};

interface WidgetLibraryPanelProps {
  addingWidgetType: CreatableWidgetType | null;
  hasFeature: (key: FeatureFlagKey) => boolean;
  onAddWidget: (type: CreatableWidgetType) => void;
  onUpgradePress: () => void;
}

export function WidgetLibraryPanel({
  addingWidgetType,
  hasFeature,
  onAddWidget,
  onUpgradePress,
}: WidgetLibraryPanelProps) {
  const [search, setSearch] = useState("");

  const filtered = CREATABLE_WIDGET_TYPES.filter((key) => {
    const name = widgetBuiltinDefinitions[key].manifest.name.toLowerCase();
    return name.includes(search.toLowerCase()) || key.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <AppIcon name="settings" size="sm" color="textSecondary" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search widgets…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Search widget library"
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No widgets match "{search}"</Text>
        ) : (
          filtered.map((widgetKey) => {
            const manifest = widgetBuiltinDefinitions[widgetKey].manifest;
            const isPremium = manifest.premium === true;
            const locked = isPremium && !hasFeature("premium_widgets");
            const isAdding = addingWidgetType === widgetKey;

            return (
              <Pressable
                key={widgetKey}
                accessibilityRole="button"
                accessibilityLabel={`Add ${manifest.name} widget`}
                style={[styles.widgetRow, isAdding ? styles.widgetRowAdding : null]}
                onPress={() => {
                  if (locked) {
                    onUpgradePress();
                    return;
                  }
                  onAddWidget(widgetKey);
                }}
                disabled={isAdding}
              >
                <View style={styles.widgetInfo}>
                  <AppIcon name={WIDGET_ICON[widgetKey]} size="sm" color="textSecondary" />
                  <View style={styles.widgetTextBlock}>
                    <Text style={styles.widgetName}>{manifest.name}</Text>
                    <Text style={styles.widgetKey}>{widgetKey}</Text>
                  </View>
                </View>
                <View style={styles.widgetActions}>
                  {locked ? (
                    <Text style={styles.premiumLabel}>Pro</Text>
                  ) : isAdding ? (
                    <Text style={styles.addingLabel}>Adding…</Text>
                  ) : (
                    <Text style={styles.addLabel}>+ Add</Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.small.fontSize,
    paddingVertical: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 2,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  widgetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  widgetRowAdding: {
    opacity: 0.6,
  },
  widgetInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  widgetTextBlock: {
    flex: 1,
    gap: 1,
  },
  widgetName: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  widgetKey: {
    fontSize: 11,
    color: colors.textSecondary,
  },
  widgetActions: {
    alignItems: "flex-end",
  },
  addLabel: {
    ...typography.small,
    color: colors.accentBlue,
    fontWeight: "700",
  },
  addingLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  premiumLabel: {
    fontSize: 11,
    color: colors.statusWarningText,
    borderWidth: 1,
    borderColor: colors.statusPremiumBorder,
    backgroundColor: colors.statusPremiumBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
    fontWeight: "700",
  },
});
