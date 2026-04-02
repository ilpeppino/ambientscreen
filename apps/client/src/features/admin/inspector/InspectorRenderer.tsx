import React from "react";
import { StyleSheet, TextInput } from "react-native";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import { InspectorSection } from "./InspectorSection";
import { InspectorReadOnlyField } from "./InspectorReadOnlyField";
import { InspectorFieldGroup } from "./InspectorFieldGroup";
import { InspectorSegmentedControl } from "./InspectorSegmentedControl";
import { InspectorBooleanField } from "./InspectorBooleanField";
import { InspectorSelectField } from "./InspectorSelectField";
import { InspectorOptionList } from "./InspectorOptionList";
import { InspectorConnectionPicker } from "./InspectorConnectionPicker";
import { InspectorResourcePicker } from "./InspectorResourcePicker";
import type {
  InspectorDefinition,
  InspectorFieldDefinition,
  InspectorMode,
} from "./inspector.types";

interface InspectorRendererProps {
  definition: InspectorDefinition;
  mode: InspectorMode;
  /** Pass true while async resources (e.g. calendar list) are being fetched. */
  resourcesLoading?: boolean;
  /**
   * Global disabled state. When true, all interactive controls become non-interactive.
   * Merges with field-level isDisabled — either source can disable a field.
   */
  disabled?: boolean;
}

/**
 * Renders an InspectorDefinition into UI.
 * Generic — contains no widget-specific logic.
 * Maps field.kind → component and respects mode (readOnly vs edit).
 */
export function InspectorRenderer({
  definition,
  mode,
  resourcesLoading,
  disabled: globalDisabled,
}: InspectorRendererProps) {
  return (
    <>
      {definition.sections.map((section) => {
        if (section.isVisible === false) return null;

        const visibleFields = section.fields.filter((f) => f.isVisible !== false);
        if (visibleFields.length === 0 && !section.actions?.length) return null;

        return (
          <InspectorSection
            key={section.id}
            title={section.title}
            description={section.description}
            // Section-level actions only shown in edit mode
            actions={mode === "edit" ? section.actions : undefined}
            disabled={globalDisabled}
          >
            {visibleFields.map((field) =>
              renderField(field, mode, globalDisabled ?? false, resourcesLoading),
            )}
          </InspectorSection>
        );
      })}
    </>
  );
}

function renderField(
  field: InspectorFieldDefinition,
  mode: InspectorMode,
  globalDisabled: boolean,
  resourcesLoading?: boolean,
): React.ReactNode {
  // Read-only: always show displayValue
  if (mode === "readOnly" || !field.editable) {
    return (
      <InspectorReadOnlyField
        key={field.id}
        label={field.label}
        value={field.displayValue ?? String(field.value ?? "")}
      />
    );
  }

  // Either global disabled or field-level isDisabled can disable a field.
  const disabled = globalDisabled || field.isDisabled === true;

  switch (field.kind) {
    case "segmented":
      return (
        <InspectorFieldGroup
          key={field.id}
          label={field.label}
          helperText={field.helperText}
          disabled={disabled}
        >
          <InspectorSegmentedControl
            options={field.options ?? []}
            value={field.value as string | number}
            onChange={(v) => field.onChange?.(v as never)}
            disabled={disabled}
          />
        </InspectorFieldGroup>
      );

    case "boolean":
      return (
        <InspectorFieldGroup
          key={field.id}
          label={field.label}
          helperText={field.helperText}
          disabled={disabled}
        >
          <InspectorBooleanField
            value={Boolean(field.value)}
            onChange={(v) => field.onChange?.(v as never)}
            disabled={disabled}
          />
        </InspectorFieldGroup>
      );

    case "connectionPicker":
      return (
        <InspectorFieldGroup
          key={field.id}
          label={field.label}
          // helperText is passed to InspectorConnectionPicker directly
          disabled={disabled}
        >
          <InspectorConnectionPicker
            options={field.options ?? []}
            value={field.value as string | null}
            onChange={(v) => field.onChange?.(v as never)}
            onConnect={field.onConnect ?? (() => undefined)}
            disabled={disabled}
            helperText={field.helperText}
          />
        </InspectorFieldGroup>
      );

    case "resourcePicker":
      return (
        <InspectorFieldGroup
          key={field.id}
          label={field.label}
          helperText={field.helperText}
          disabled={disabled}
        >
          <InspectorResourcePicker
            options={field.options ?? []}
            value={field.value as string | string[] | null}
            onChange={(v) => field.onChange?.(v as never)}
            loading={!disabled && resourcesLoading}
            disabled={disabled}
            selectionMode={field.selectionMode}
          />
        </InspectorFieldGroup>
      );

    case "select":
      return (
        <InspectorFieldGroup
          key={field.id}
          label={field.label}
          helperText={field.helperText}
          disabled={disabled}
        >
          <InspectorSelectField
            options={field.options ?? []}
            value={field.value as string | number}
            onChange={(v) => field.onChange?.(v as never)}
            disabled={disabled}
          />
        </InspectorFieldGroup>
      );

    case "optionList":
      // Explicit always-visible list. Use this only when all options must remain
      // visible simultaneously. Prefer `select` for standard single-choice fields.
      return (
        <InspectorFieldGroup
          key={field.id}
          label={field.label}
          helperText={field.helperText}
          disabled={disabled}
        >
          <InspectorOptionList
            options={field.options ?? []}
            value={field.value as string | number | Array<string | number>}
            onChange={(v) => field.onChange?.(v as never)}
            disabled={disabled}
            selectionMode={field.selectionMode}
          />
        </InspectorFieldGroup>
      );

    case "text":
      return (
        <InspectorFieldGroup
          key={field.id}
          label={field.label}
          helperText={field.helperText}
          disabled={disabled}
        >
          <TextInput
            style={[styles.textInput, disabled ? styles.textInputDisabled : null]}
            value={typeof field.value === "string" ? field.value : ""}
            onChangeText={(v) => field.onChange?.(v as never)}
            multiline={field.multiline}
            editable={!disabled}
            autoCapitalize="none"
            autoCorrect={false}
            placeholderTextColor={colors.textSecondary}
          />
        </InspectorFieldGroup>
      );

    default:
      // custom or unknown kind — fall back to read-only display
      return (
        <InspectorReadOnlyField
          key={field.id}
          label={field.label}
          value={field.displayValue ?? String(field.value ?? "")}
        />
      );
  }
}

const styles = StyleSheet.create({
  textInput: {
    backgroundColor: colors.surfaceInput,
    borderWidth: 1,
    borderColor: colors.borderInput,
    borderRadius: radius.sm,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    ...typography.compactControl,
    color: colors.textPrimary,
  },
  textInputDisabled: {
    opacity: 0.5,
  },
});
