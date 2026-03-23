import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import { AppIcon } from "../../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";

const WIDGET_ICON = {
  clockDate: "clock",
  weather: "weather",
  calendar: "calendar",
} as const;

interface WidgetPropertiesPanelProps {
  selectedWidget: DisplayLayoutWidgetEnvelope | null;
}

export function WidgetPropertiesPanel({
  selectedWidget,
}: WidgetPropertiesPanelProps) {
  if (!selectedWidget) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <AppIcon name="grid" size="md" color="textSecondary" />
        </View>
        <Text style={styles.emptyTitle}>No widget selected</Text>
        <Text style={styles.emptyMessage}>
          Click a widget on the canvas to inspect and edit its properties.
        </Text>
      </View>
    );
  }

  const manifest = widgetBuiltinDefinitions[selectedWidget.widgetKey]?.manifest;
  const widgetName = manifest?.name ?? selectedWidget.widgetKey;
  const iconName = WIDGET_ICON[selectedWidget.widgetKey] ?? "grid";
  const configEntries = Object.entries(selectedWidget.config).filter(
    ([, value]) => value !== null && value !== undefined && value !== "",
  );

  return (
    <ScrollView
      style={styles.panel}
      contentContainerStyle={styles.content}
      showsVerticalScrollIndicator={false}
    >
      {/* Widget identity */}
      <View style={styles.identityRow}>
        <View style={styles.identityIconWrap}>
          <AppIcon name={iconName} size="sm" color="textSecondary" />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.widgetName}>{widgetName}</Text>
          <Text style={styles.widgetId} numberOfLines={1}>
            {selectedWidget.widgetInstanceId.slice(0, 12)}…
          </Text>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Layout */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Layout</Text>
        <View style={styles.layoutGrid}>
          <LayoutCell label="X" value={selectedWidget.layout.x} />
          <LayoutCell label="Y" value={selectedWidget.layout.y} />
          <LayoutCell label="W" value={selectedWidget.layout.w} />
          <LayoutCell label="H" value={selectedWidget.layout.h} />
        </View>
      </View>

      {/* Config */}
      {configEntries.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Configuration</Text>
            <View style={styles.configList}>
              {configEntries.map(([key, value]) => (
                <View key={key} style={styles.configRow}>
                  <Text style={styles.configKey}>{key}</Text>
                  <Text style={styles.configValue} numberOfLines={2}>
                    {String(value)}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        </>
      ) : null}

    </ScrollView>
  );
}

interface LayoutCellProps {
  label: string;
  value: number;
}

function LayoutCell({ label, value }: LayoutCellProps) {
  return (
    <View style={layoutCellStyles.cell}>
      <Text style={layoutCellStyles.label}>{label}</Text>
      <Text style={layoutCellStyles.value}>{value}</Text>
    </View>
  );
}

const layoutCellStyles = StyleSheet.create({
  cell: {
    flex: 1,
    alignItems: "center",
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
  },
  label: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  value: {
    ...typography.body,
    color: colors.textPrimary,
    fontWeight: "700",
  },
});

const styles = StyleSheet.create({
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
    gap: spacing.sm,
  },
  emptyIconWrap: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: spacing.xs,
  },
  emptyTitle: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "700",
    textAlign: "center",
  },
  emptyMessage: {
    fontSize: 12,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 18,
  },
  panel: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.md,
  },
  divider: {
    height: 1,
    backgroundColor: colors.border,
    marginHorizontal: -spacing.lg,
  },
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  identityIconWrap: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: "center",
    justifyContent: "center",
  },
  identityText: {
    flex: 1,
    gap: 2,
  },
  widgetName: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  widgetId: {
    fontSize: 11,
    color: colors.textSecondary,
    fontFamily: "monospace",
  },
  section: {
    gap: spacing.sm,
  },
  sectionLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  layoutGrid: {
    flexDirection: "row",
    gap: spacing.sm,
  },
  configList: {
    gap: 6,
  },
  configRow: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "flex-start",
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  configKey: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
    minWidth: 72,
    fontFamily: "monospace",
  },
  configValue: {
    flex: 1,
    fontSize: 12,
    color: colors.textPrimary,
  },
});
