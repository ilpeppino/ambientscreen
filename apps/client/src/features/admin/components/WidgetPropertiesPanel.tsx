import React from "react";
import { ScrollView, StyleSheet, Text, View } from "react-native";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { WidgetInstance } from "@ambient/shared-contracts";
import { AppIcon } from "../../../shared/ui/components";
import { ErrorState } from "../../../shared/ui/ErrorState";
import {
  ActionRow,
  InlineStatusBadge,
  ManagementActionButton,
} from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";

const WIDGET_ICON = {
  clockDate: "clock",
  weather: "weather",
  calendar: "calendar",
} as const;

interface WidgetPropertiesPanelProps {
  selectedWidget: DisplayLayoutWidgetEnvelope | null;
  selectedWidgetInstance: WidgetInstance | null;
  settingActiveWidgetId: string | null;
  onSetActive: (widgetId: string) => void;
  error: string | null;
  onRetry: () => void;
}

export function WidgetPropertiesPanel({
  selectedWidget,
  selectedWidgetInstance,
  settingActiveWidgetId,
  onSetActive,
  error,
  onRetry,
}: WidgetPropertiesPanelProps) {
  if (!selectedWidget) {
    return (
      <View style={styles.emptyState}>
        <AppIcon name="grid" size="sm" color="textSecondary" />
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
  const isActive = selectedWidgetInstance?.isActive ?? false;
  const isSettingActive = settingActiveWidgetId === selectedWidget.widgetInstanceId;
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
        <AppIcon name={iconName} size="sm" color="textSecondary" />
        <View style={styles.identityText}>
          <Text style={styles.widgetName}>{widgetName}</Text>
          <Text style={styles.widgetId} numberOfLines={1}>
            {selectedWidget.widgetInstanceId.slice(0, 12)}…
          </Text>
        </View>
        <InlineStatusBadge
          label={isActive ? "Active" : "Inactive"}
          tone={isActive ? "success" : "neutral"}
          icon={isActive ? "check" : "close"}
        />
      </View>

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
      ) : null}

      {/* Actions */}
      <View style={styles.section}>
        <Text style={styles.sectionLabel}>Actions</Text>
        <ActionRow>
          <ManagementActionButton
            label="Set Active"
            tone="secondary"
            disabled={isActive}
            loading={isSettingActive}
            onPress={() => onSetActive(selectedWidget.widgetInstanceId)}
          />
        </ActionRow>
      </View>

      {error ? <ErrorState compact message={error} onRetry={onRetry} /> : null}
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
  identityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
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
