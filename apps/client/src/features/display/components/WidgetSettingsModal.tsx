import React, { useEffect, useMemo, useState } from "react";
import {
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  View,
} from "react-native";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { WidgetConfigSchema } from "@ambient/shared-contracts";
import { TextInput as AppTextInput } from "../../../shared/ui/components";
import {
  buildConfigDraft,
  buildFieldDescriptors,
  type WidgetConfigFieldDescriptor,
  validateConfigDraft,
} from "./WidgetSettingsModal.logic";

interface WidgetSettingsModalProps {
  visible: boolean;
  widgetName: string;
  schema: WidgetConfigSchema;
  config: Record<string, unknown>;
  saving?: boolean;
  saveError?: string | null;
  onClose: () => void;
  onSave: (config: Record<string, unknown>) => Promise<void> | void;
}

export function WidgetSettingsModal({
  visible,
  widgetName,
  schema,
  config,
  saving = false,
  saveError = null,
  onClose,
  onSave,
}: WidgetSettingsModalProps) {
  const [draft, setDraft] = useState<Record<string, unknown>>({});
  const [validationError, setValidationError] = useState<string | null>(null);

  const fieldDescriptors = useMemo(() => buildFieldDescriptors(schema), [schema]);

  useEffect(() => {
    if (!visible) {
      return;
    }

    setDraft(buildConfigDraft({ schema, config }));
    setValidationError(null);
  }, [config, schema, visible]);

  function handleStringChange(key: string, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleBooleanChange(key: string, value: boolean) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleNumberChange(key: string, value: number) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function handleEnumChange(key: string, value: string) {
    setDraft((current) => ({
      ...current,
      [key]: value,
    }));
  }

  async function handleSave() {
    const validation = validateConfigDraft(schema, draft);
    if (!validation.valid) {
      setValidationError(validation.message);
      return;
    }

    setValidationError(null);
    await onSave(draft);
  }

  return (
    <Modal
      animationType="fade"
      transparent
      visible={visible}
      onRequestClose={onClose}
    >
      <View style={styles.backdrop}>
        <View style={styles.modalCard}>
          <Text style={styles.title}>{widgetName} Settings</Text>

          <ScrollView style={styles.formContainer} contentContainerStyle={styles.formContent}>
            {fieldDescriptors.map((descriptor) => (
              <View key={descriptor.key} style={styles.fieldBlock}>
                <Text style={styles.fieldLabel}>{descriptor.label}</Text>
                <FieldEditor
                  descriptor={descriptor}
                  value={draft[descriptor.key]}
                  onStringChange={(value) => handleStringChange(descriptor.key, value)}
                  onNumberChange={(value) => handleNumberChange(descriptor.key, value)}
                  onBooleanChange={(value) => handleBooleanChange(descriptor.key, value)}
                  onEnumChange={(value) => handleEnumChange(descriptor.key, value)}
                />
              </View>
            ))}
          </ScrollView>

          {validationError ? <Text style={styles.errorText}>{validationError}</Text> : null}
          {saveError ? (
            <View style={styles.errorRow}>
              <Text style={styles.errorText}>{saveError}</Text>
              <Pressable
                style={styles.retryButton}
                onPress={() => {
                  void handleSave();
                }}
                disabled={saving}
              >
                <Text style={styles.retryLabel}>Retry</Text>
              </Pressable>
            </View>
          ) : null}

          <View style={styles.actionsRow}>
            <Pressable
              accessibilityRole="button"
              style={[styles.actionButton, styles.cancelButton]}
              onPress={onClose}
              disabled={saving}
            >
              <Text style={styles.actionLabel}>Cancel</Text>
            </Pressable>
            <Pressable
              accessibilityRole="button"
              style={[styles.actionButton, styles.saveButton, saving ? styles.actionButtonDisabled : null]}
              onPress={() => {
                void handleSave();
              }}
              disabled={saving}
            >
              <Text style={styles.actionLabel}>{saving ? "Saving..." : "Save"}</Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

interface FieldEditorProps {
  descriptor: WidgetConfigFieldDescriptor;
  value: unknown;
  onStringChange: (value: string) => void;
  onNumberChange: (value: number) => void;
  onBooleanChange: (value: boolean) => void;
  onEnumChange: (value: string) => void;
}

function FieldEditor({
  descriptor,
  value,
  onStringChange,
  onNumberChange,
  onBooleanChange,
  onEnumChange,
}: FieldEditorProps) {
  if (descriptor.kind === "boolean") {
    return (
      <View style={styles.booleanRow}>
        <Switch
          value={Boolean(value)}
          onValueChange={onBooleanChange}
        />
      </View>
    );
  }

  if (descriptor.kind === "enum") {
    return (
      <View style={styles.enumOptionsRow}>
        {(descriptor.options ?? []).map((option) => {
          const selected = value === option;
          return (
            <Pressable
              key={option}
              style={[styles.enumOption, selected ? styles.enumOptionSelected : null]}
              onPress={() => onEnumChange(option)}
            >
              <Text style={[styles.enumOptionLabel, selected ? styles.enumOptionLabelSelected : null]}>
                {option}
              </Text>
            </Pressable>
          );
        })}
      </View>
    );
  }

  if (descriptor.kind === "number") {
    return (
      <AppTextInput
        value={typeof value === "number" && Number.isFinite(value) ? String(value) : ""}
        onChangeText={(nextValue) => {
          const parsed = Number.parseInt(nextValue, 10);
          onNumberChange(Number.isNaN(parsed) ? 0 : parsed);
        }}
        inputStyle={styles.textInput}
        autoCorrect={false}
        autoCapitalize="none"
        keyboardType="numeric"
      />
    );
  }

  return (
    <AppTextInput
      value={typeof value === "string" ? value : ""}
      onChangeText={onStringChange}
      inputStyle={styles.textInput}
      autoCorrect={false}
      autoCapitalize="none"
    />
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.65)",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: spacing.lg,
  },
  modalCard: {
    width: "100%",
    maxWidth: 560,
    borderRadius: radius.lg,
    backgroundColor: colors.surfaceModal,
    borderWidth: 1,
    borderColor: colors.borderInput,
    padding: spacing.lg,
    gap: 10,
    maxHeight: "85%",
  },
  title: {
    color: colors.textPrimary,
    fontSize: typography.subtitle.fontSize,
    fontWeight: "700",
  },
  formContainer: {
    maxHeight: 360,
  },
  formContent: {
    gap: spacing.md,
    paddingBottom: spacing.sm,
  },
  fieldBlock: {
    gap: spacing.sm,
  },
  fieldLabel: {
    color: colors.textPrimary,
    fontSize: typography.small.fontSize,
    fontWeight: "600",
  },
  textInput: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    backgroundColor: colors.surfaceInput,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    fontSize: typography.label.fontSize,
  },
  booleanRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  enumOptionsRow: {
    flexDirection: "row",
    gap: spacing.sm,
    flexWrap: "wrap",
  },
  enumOption: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surfaceInput,
  },
  enumOptionSelected: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.statusInfoBg,
  },
  enumOptionLabel: {
    color: colors.textSecondary,
    fontSize: typography.small.fontSize,
    fontWeight: "600",
  },
  enumOptionLabelSelected: {
    color: colors.textPrimary,
  },
  errorRow: {
    gap: spacing.sm,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.small.fontSize,
  },
  retryButton: {
    alignSelf: "flex-start",
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.error,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  retryLabel: {
    color: colors.error,
    fontSize: typography.small.fontSize,
    fontWeight: "600",
  },
  actionsRow: {
    flexDirection: "row",
    justifyContent: "flex-end",
    gap: 10,
  },
  actionButton: {
    minWidth: 100,
    borderRadius: radius.sm,
    paddingVertical: 10,
    paddingHorizontal: 14,
    alignItems: "center",
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  cancelButton: {
    backgroundColor: colors.surfaceModal,
    borderWidth: 1,
    borderColor: colors.borderInput,
  },
  saveButton: {
    backgroundColor: colors.accentBlue,
  },
  actionLabel: {
    color: colors.textPrimary,
    fontSize: typography.label.fontSize,
    fontWeight: "700",
  },
});
