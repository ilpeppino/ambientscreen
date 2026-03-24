import React from "react";
import { Pressable, StyleSheet, View } from "react-native";
import type { WidgetSettingsFormProps } from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components/Text";
import { TextInput } from "../../shared/ui/components/TextInput";
import { colors, radius, spacing } from "../../shared/ui/theme";

type WeatherUnits = "metric" | "imperial" | "standard";

const UNITS_OPTIONS: { value: WeatherUnits; label: string }[] = [
  { value: "metric", label: "°C" },
  { value: "imperial", label: "°F" },
  { value: "standard", label: "K" },
];

const FORECAST_SLOTS_OPTIONS = [1, 2, 3, 4, 5];

export function WeatherSettingsForm({
  config,
  disabled,
  onChange,
}: WidgetSettingsFormProps<"weather">) {
  const city = config.city ?? "";
  const countryCode = config.countryCode ?? "";
  const units = config.units ?? "metric";
  const forecastSlots = config.forecastSlots ?? 3;

  return (
    <View style={styles.container}>
      <TextInput
        label="City"
        value={city}
        onChangeText={(value) => onChange({ ...config, city: value })}
        placeholder="e.g. Amsterdam"
        editable={!disabled}
        autoCapitalize="words"
        autoCorrect={false}
      />
      <View style={styles.fieldGap} />
      <TextInput
        label="Country code (optional)"
        value={countryCode}
        onChangeText={(value) => onChange({ ...config, countryCode: value || undefined })}
        placeholder="e.g. NL"
        editable={!disabled}
        autoCapitalize="characters"
        autoCorrect={false}
        maxLength={2}
      />
      <View style={styles.fieldGap} />
      <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
        Units
      </Text>
      <View style={styles.chipRow}>
        {UNITS_OPTIONS.map((option) => {
          const selected = units === option.value;
          return (
            <Pressable
              key={option.value}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => !disabled && onChange({ ...config, units: option.value })}
              disabled={disabled}
            >
              <Text
                style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}
              >
                {option.label}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <View style={styles.fieldGap} />
      <Text variant="caption" color="textSecondary" style={styles.sectionLabel}>
        Forecast slots
      </Text>
      <View style={styles.chipRow}>
        {FORECAST_SLOTS_OPTIONS.map((count) => {
          const selected = forecastSlots === count;
          return (
            <Pressable
              key={count}
              style={[styles.chip, selected ? styles.chipSelected : null]}
              onPress={() => !disabled && onChange({ ...config, forecastSlots: count })}
              disabled={disabled}
            >
              <Text
                style={[styles.chipLabel, selected ? styles.chipLabelSelected : null]}
              >
                {String(count)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  fieldGap: {
    height: spacing.md,
  },
  sectionLabel: {
    marginBottom: spacing.xs,
  },
  chipRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: spacing.xs,
  },
  chip: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
  },
  chipSelected: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.accentBlue,
  },
  chipLabel: {
    ...StyleSheet.flatten({ fontSize: 13, fontWeight: "500" }),
    color: colors.textSecondary,
  },
  chipLabelSelected: {
    color: colors.textPrimary,
  },
});
