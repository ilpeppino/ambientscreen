import React, { useCallback, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { WidgetConfigFieldDescriptor } from "../../display/components/WidgetSettingsModal.logic";
import {
  buildConfigDraft,
  buildFieldDescriptors,
  humanizeFieldLabel,
  validateConfigDraft,
} from "../../display/components/WidgetSettingsModal.logic";
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
  onSaveConfig?: (widgetId: string, config: Record<string, unknown>) => Promise<void>;
}

export function WidgetPropertiesPanel({
  selectedWidget,
  onSaveConfig,
}: WidgetPropertiesPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleStartEdit = useCallback(() => {
    if (!selectedWidget) return;
    const schema = selectedWidget.configSchema ?? {};
    setDraft(buildConfigDraft({ schema, config: selectedWidget.config }));
    setSaveError(null);
    setValidationError(null);
    setIsEditing(true);
  }, [selectedWidget]);

  const handleCancelEdit = useCallback(() => {
    setIsEditing(false);
    setSaveError(null);
    setValidationError(null);
  }, []);

  const handleSave = useCallback(async () => {
    if (!selectedWidget || !onSaveConfig) return;
    const schema = selectedWidget.configSchema ?? {};
    const validation = validateConfigDraft(schema, draft);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }
    try {
      setSaving(true);
      setSaveError(null);
      setValidationError(null);
      await onSaveConfig(selectedWidget.widgetInstanceId, draft);
      setIsEditing(false);
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : "Failed to save config");
    } finally {
      setSaving(false);
    }
  }, [selectedWidget, draft, onSaveConfig]);

  const setFieldValue = useCallback((key: string, value: unknown) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  }, []);

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
  const schema = selectedWidget.configSchema ?? {};
  const descriptors = buildFieldDescriptors(schema);

  const configEntries = isEditing
    ? null
    : Object.entries(selectedWidget.config).filter(
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
        {onSaveConfig ? (
          isEditing ? (
            <View style={styles.editActions}>
              <Pressable
                style={styles.iconButton}
                onPress={() => void handleSave()}
                disabled={saving}
                accessibilityLabel="Save config"
              >
                <AppIcon name="check" size="sm" color={saving ? "textSecondary" : "textPrimary"} />
              </Pressable>
              <Pressable
                style={styles.iconButton}
                onPress={handleCancelEdit}
                disabled={saving}
                accessibilityLabel="Cancel edit"
              >
                <AppIcon name="close" size="sm" color="textSecondary" />
              </Pressable>
            </View>
          ) : (
            <Pressable
              style={styles.iconButton}
              onPress={handleStartEdit}
              accessibilityLabel="Edit config"
            >
              <AppIcon name="pencil" size="sm" color="textSecondary" />
            </Pressable>
          )
        ) : null}
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

      {/* Config — read-only view */}
      {!isEditing && configEntries && configEntries.length > 0 ? (
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

      {/* Config — edit mode */}
      {isEditing && descriptors.length > 0 ? (
        <>
          <View style={styles.divider} />
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Configuration</Text>
            <View style={styles.configList}>
              {descriptors.map((descriptor) => (
                <InlineFieldEditor
                  key={descriptor.key}
                  descriptor={descriptor}
                  value={draft[descriptor.key]}
                  onChange={setFieldValue}
                />
              ))}
            </View>
            {(validationError ?? saveError) ? (
              <Text style={styles.errorText}>{validationError ?? saveError}</Text>
            ) : null}
          </View>
        </>
      ) : null}
    </ScrollView>
  );
}

// ---------------------------------------------------------------------------
// InlineFieldEditor
// ---------------------------------------------------------------------------

interface InlineFieldEditorProps {
  descriptor: WidgetConfigFieldDescriptor;
  value: unknown;
  onChange: (key: string, value: unknown) => void;
}

function InlineFieldEditor({ descriptor, value, onChange }: InlineFieldEditorProps) {
  const label = humanizeFieldLabel(descriptor.key);

  if (descriptor.kind === "boolean") {
    return (
      <View style={styles.fieldRow}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <Switch
          value={Boolean(value)}
          onValueChange={(next) => onChange(descriptor.key, next)}
        />
      </View>
    );
  }

  if (descriptor.kind === "enum" && descriptor.options) {
    return (
      <View style={styles.fieldColumn}>
        <Text style={styles.fieldLabel}>{label}</Text>
        <View style={styles.enumRow}>
          {descriptor.options.map((option) => (
            <Pressable
              key={option}
              style={[styles.enumOption, value === option && styles.enumOptionSelected]}
              onPress={() => onChange(descriptor.key, option)}
            >
              <Text
                style={[
                  styles.enumOptionText,
                  value === option && styles.enumOptionTextSelected,
                ]}
              >
                {option}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
    );
  }

  return (
    <View style={styles.fieldColumn}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <TextInput
        style={styles.textInput}
        value={descriptor.kind === "number"
          ? (typeof value === "number" && Number.isFinite(value) ? String(value) : "")
          : (typeof value === "string" ? value : "")}
        onChangeText={(text) => {
          if (descriptor.kind === "number") {
            const parsed = Number.parseInt(text, 10);
            onChange(descriptor.key, Number.isNaN(parsed) ? 0 : parsed);
          } else {
            onChange(descriptor.key, text);
          }
        }}
        keyboardType={descriptor.kind === "number" ? "numeric" : "default"}
        placeholderTextColor={colors.textSecondary}
      />
    </View>
  );
}

// ---------------------------------------------------------------------------
// LayoutCell
// ---------------------------------------------------------------------------

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
  editActions: {
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
    gap: spacing.sm,
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
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
  },
  fieldColumn: {
    gap: spacing.xs,
  },
  fieldLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: 0.5,
  },
  enumRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  enumOption: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surfaceInput,
  },
  enumOptionSelected: {
    borderColor: colors.accent ?? colors.textPrimary,
    backgroundColor: colors.surfaceCard,
  },
  enumOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  enumOptionTextSelected: {
    color: colors.textPrimary,
    fontWeight: "700",
  },
  textInput: {
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: 6,
    fontSize: 12,
    color: colors.textPrimary,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
