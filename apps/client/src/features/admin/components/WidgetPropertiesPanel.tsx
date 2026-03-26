import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Switch, Text, TextInput, View } from "react-native";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { WidgetKey } from "@ambient/shared-contracts";
import { CalendarSettingsForm } from "../../../widgets/calendar/settings-form";
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
import { InspectorReadOnlyField, InspectorReadOnlySection } from "./InspectorReadOnlyField";
import { buildWidgetReadOnlyFields } from "../widgetInspectorSummary";
import { getIntegrationConnection, listGoogleCalendars } from "../../../services/api/integrationsApi";

const WIDGET_ICON = {
  clockDate: "clock",
  weather: "weather",
  calendar: "calendar",
} as const;

interface CalendarResolution {
  accountLabel: string | null;
  calendarLabel: string | null;
  loading: boolean;
}

function useCalendarResolution(config: Record<string, unknown>): CalendarResolution {
  const [accountLabel, setAccountLabel] = useState<string | null>(null);
  const [calendarLabel, setCalendarLabel] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const integrationConnectionId = config.integrationConnectionId as string | undefined;
  const calendarId = config.calendarId as string | undefined;

  useEffect(() => {
    if (!integrationConnectionId) {
      setAccountLabel(null);
      setCalendarLabel(null);
      return;
    }

    setLoading(true);

    Promise.all([
      getIntegrationConnection(integrationConnectionId).catch(() => null),
      calendarId ? listGoogleCalendars(integrationConnectionId).catch(() => []) : Promise.resolve([]),
    ])
      .then(([connection, calendars]) => {
        const label = connection?.accountLabel ?? connection?.accountEmail ?? null;
        setAccountLabel(label);

        if (calendarId && calendars && calendars.length > 0) {
          const calendar = calendars.find((cal) => cal.id === calendarId);
          setCalendarLabel(calendar?.summary ?? null);
        } else {
          setCalendarLabel(null);
        }
      })
      .finally(() => setLoading(false));
  }, [integrationConnectionId, calendarId]);

  return { accountLabel, calendarLabel, loading };
}

interface ReadOnlyConfigurationViewProps {
  selectedWidget: DisplayLayoutWidgetEnvelope;
}

function ReadOnlyConfigurationView({ selectedWidget }: ReadOnlyConfigurationViewProps) {
  const fields = buildWidgetReadOnlyFields(selectedWidget.widgetKey, selectedWidget.config);
  const calendarResolution = useCalendarResolution(selectedWidget.config);
  const provider = selectedWidget.config.provider as string | undefined;
  const calendarId = selectedWidget.config.calendarId as string | undefined;

  const hasFields = fields.length > 0 || (selectedWidget.widgetKey === "calendar" && provider === "google");

  if (!hasFields) {
    return null;
  }

  return (
    <InspectorReadOnlySection title="Configuration">
      {selectedWidget.widgetKey === "calendar" && provider === "google" && (
        <>
          <InspectorReadOnlyField
            label="Connected account"
            value={calendarResolution.accountLabel ?? ""}
            emptyText={calendarResolution.loading ? "Loading…" : "—"}
            faded={!calendarResolution.accountLabel}
          />
          {calendarId && (
            <InspectorReadOnlyField
              label="Calendar"
              value={calendarResolution.calendarLabel ?? ""}
              emptyText={calendarResolution.loading ? "Loading…" : "—"}
              faded={!calendarResolution.calendarLabel}
            />
          )}
        </>
      )}
      {fields.map(({ key, label, value }) => (
        <InspectorReadOnlyField key={key} label={label} value={value} />
      ))}
    </InspectorReadOnlySection>
  );
}

interface WidgetPropertiesPanelProps {
  selectedWidget: DisplayLayoutWidgetEnvelope | null;
  selectedLibraryWidgetType?: WidgetKey | null;
  inspectorMode?: "canvas" | "library" | null;
  onSaveConfig?: (widgetId: string, config: Record<string, unknown>) => Promise<void>;
}

export function WidgetPropertiesPanel({
  selectedWidget,
  selectedLibraryWidgetType = null,
  inspectorMode = null,
  onSaveConfig,
}: WidgetPropertiesPanelProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const hasMountedRef = useRef(false);

  useEffect(() => {
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      return;
    }
    setIsEditing(false);
    setSaveError(null);
    setValidationError(null);
  }, [selectedWidget?.widgetInstanceId, selectedLibraryWidgetType, inspectorMode]);

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

  if (inspectorMode === "library" && selectedLibraryWidgetType) {
    const definition = widgetBuiltinDefinitions[selectedLibraryWidgetType];
    const manifest = definition.manifest;
    const iconName = WIDGET_ICON[selectedLibraryWidgetType] ?? "grid";
    const defaultConfigEntries = Object.entries(definition.defaultConfig ?? {}).filter(
      ([, value]) => value !== null && value !== undefined && value !== "",
    );

    return (
      <ScrollView
        style={styles.panel}
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.identityRow}>
          <View style={styles.identityIconWrap}>
            <AppIcon name={iconName} size="sm" color="textSecondary" />
          </View>
          <View style={styles.identityText}>
            <Text style={styles.widgetName}>{manifest.name}</Text>
          </View>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Overview</Text>
          <KeyValueRow label="Category" value={manifest.category} muted />
          <KeyValueRow label="Description" value={manifest.description} />
          <KeyValueRow
            label="Default Size"
            value={`${manifest.defaultLayout.w} × ${manifest.defaultLayout.h}`}
            monospace
          />
        </View>

        {defaultConfigEntries.length > 0 ? (
          <View style={styles.section}>
            <Text style={styles.sectionLabel}>Default Configuration</Text>
            <View style={styles.configList}>
              {defaultConfigEntries.map(([key, value]) => (
                <KeyValueRow key={key} label={key} value={String(value)} monospace />
              ))}
            </View>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionLabel}>How To Use</Text>
          <Text style={styles.helperText}>Drag from the sidebar library to place this widget on the canvas.</Text>
        </View>
      </ScrollView>
    );
  }

  if (!selectedWidget) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIconWrap}>
          <AppIcon name="grid" size="md" color="textSecondary" />
        </View>
        <Text style={styles.emptyTitle}>No widget selected</Text>
        <Text style={styles.emptyMessage}>
          Select a widget in the library to inspect defaults, or select a canvas widget to edit settings.
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
      <View style={styles.identityRow}>
        <View style={styles.identityIconWrap}>
          <AppIcon name={iconName} size="sm" color="textSecondary" />
        </View>
        <View style={styles.identityText}>
          <Text style={styles.widgetName}>{widgetName}</Text>
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

      {!isEditing ? (
        <ReadOnlyConfigurationView selectedWidget={selectedWidget} />
      ) : null}

      {isEditing ? (
        <View style={styles.section}>
          <Text style={styles.sectionLabel}>Edit Configuration</Text>
          {selectedWidget.widgetKey === "calendar" ? (
            <CalendarSettingsForm
              widgetKey={selectedWidget.widgetKey}
              schema={selectedWidget.configSchema ?? {}}
              config={draft as Record<string, unknown>}
              disabled={saving}
              onChange={(updatedConfig) => {
                setDraft(updatedConfig as Record<string, unknown>);
              }}
            />
          ) : descriptors.length > 0 ? (
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
          ) : null}
          {(validationError ?? saveError) ? (
            <Text style={styles.errorText}>{validationError ?? saveError}</Text>
          ) : null}
        </View>
      ) : null}
    </ScrollView>
  );
}

interface KeyValueRowProps {
  label: string;
  value: string;
  monospace?: boolean;
  muted?: boolean;
}

function KeyValueRow({ label, value, monospace = false, muted = false }: KeyValueRowProps) {
  return (
    <View style={styles.keyValueRow}>
      <Text style={[styles.keyLabel, muted ? styles.keyLabelMuted : null]}>{label}</Text>
      <Text style={[styles.keyValue, monospace ? styles.keyValueMono : null]} numberOfLines={3}>
        {value}
      </Text>
    </View>
  );
}

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
    opacity: 0.82,
  },
  panel: {
    flex: 1,
  },
  content: {
    padding: spacing.lg,
    gap: spacing.lg,
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
    opacity: 0.86,
  },
  configList: {
    gap: spacing.xs,
  },
  keyValueRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    justifyContent: "space-between",
    gap: spacing.sm,
    paddingVertical: spacing.xs,
  },
  keyLabel: {
    ...typography.caption,
    color: colors.textSecondary,
    minWidth: 84,
    textTransform: "uppercase",
    letterSpacing: 0.4,
  },
  keyLabelMuted: {
    opacity: 0.72,
  },
  keyValue: {
    flex: 1,
    ...typography.small,
    color: colors.textPrimary,
    textAlign: "right",
  },
  keyValueMono: {
    fontFamily: "monospace",
  },
  fieldRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.borderInput,
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
    borderColor: colors.accentBlue,
    backgroundColor: colors.statusInfoBg,
  },
  enumOptionText: {
    fontSize: 12,
    color: colors.textSecondary,
  },
  enumOptionTextSelected: {
    color: colors.statusInfoText,
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
  helperText: {
    fontSize: 12,
    color: colors.statusInfoText,
    lineHeight: 18,
    opacity: 0.92,
  },
  errorText: {
    fontSize: 11,
    color: colors.error,
    marginTop: spacing.xs,
  },
});
