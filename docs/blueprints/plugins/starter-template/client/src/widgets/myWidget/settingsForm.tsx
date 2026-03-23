// ============================================================
// STEP 5b: Settings Form (optional)
//
// Copy to:
//   apps/client/src/widgets/myWidget/settingsForm.tsx
//
// Rendered when the user opens widget settings.
// Call onChange with the updated config — do not persist directly.
// This file is optional. Delete if you don't need user-editable settings.
// ============================================================

import React from "react";
import { StyleSheet, Switch, Text, TextInput, View } from "react-native";
import type { WidgetSettingsFormProps } from "@ambient/shared-contracts";

export function MyWidgetSettingsForm({
  config,
  onChange,
  disabled,
}: WidgetSettingsFormProps<"myWidget">) {
  return (
    <View style={styles.form}>
      {/* Text input example */}
      <View style={styles.field}>
        <Text style={styles.label}>Title</Text>
        <TextInput
          style={styles.input}
          value={config.title}
          onChangeText={(text) => onChange({ ...config, title: text })}
          editable={!disabled}
          placeholder="Widget title"
          placeholderTextColor="#555"
        />
      </View>

      {/* Boolean toggle example */}
      <View style={styles.fieldRow}>
        <Text style={styles.label}>Show label</Text>
        <Switch
          value={config.showLabel}
          onValueChange={(value) => onChange({ ...config, showLabel: value })}
          disabled={disabled}
        />
      </View>

      {/* Enum selection example — adapt to your UI library */}
      <View style={styles.field}>
        <Text style={styles.label}>Display mode: {config.displayMode}</Text>
        {/* TODO: replace with a proper picker/segmented control */}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  form: {
    gap: 16,
    paddingVertical: 8,
  },
  field: {
    gap: 6,
  },
  fieldRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  label: {
    fontSize: 14,
    color: "#bfbfbf",
  },
  input: {
    borderWidth: 1,
    borderColor: "#333",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    color: "#fff",
    fontSize: 14,
    backgroundColor: "rgba(255,255,255,0.05)",
  },
});
