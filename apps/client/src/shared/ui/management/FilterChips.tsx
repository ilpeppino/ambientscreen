import React from "react";
import { Pressable, ScrollView, StyleSheet, View } from "react-native";
import { AppIcon, type AppIconName } from "../components";
import { Text } from "../components/Text";
import { colors, radius, spacing } from "../theme";

export interface FilterChipItem {
  key: string;
  label: string;
  icon?: AppIconName;
}

interface FilterChipsProps {
  items: FilterChipItem[];
  activeKey: string | null;
  onChange: (key: string) => void;
  showAllOption?: string;
}

export function FilterChips({
  items,
  activeKey,
  onChange,
  showAllOption,
}: FilterChipsProps) {
  return (
    <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.row}>
      {showAllOption ? (
        <Pressable
          accessibilityRole="button"
          style={[styles.chip, activeKey === null ? styles.chipActive : null]}
          onPress={() => onChange("")}
        >
          <Text style={[styles.label, activeKey === null ? styles.labelActive : null]}>{showAllOption}</Text>
        </Pressable>
      ) : null}
      {items.map((item) => {
        const selected = item.key === activeKey;

        return (
          <Pressable
            key={item.key}
            accessibilityRole="button"
            style={[styles.chip, selected ? styles.chipActive : null]}
            onPress={() => onChange(item.key)}
          >
            <View style={styles.identity}>
              {item.icon ? (
                <AppIcon
                  name={item.icon}
                  size="sm"
                  color={selected ? "textPrimary" : "textSecondary"}
                />
              ) : null}
              <Text style={[styles.label, selected ? styles.labelActive : null]}>{item.label}</Text>
            </View>
          </Pressable>
        );
      })}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: spacing.sm,
    paddingRight: spacing.md,
  },
  chip: {
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceCard,
    minHeight: 34,
    justifyContent: "center",
    paddingHorizontal: spacing.md,
  },
  chipActive: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.statusInfoBg,
  },
  identity: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  label: {
    color: colors.textSecondary,
    fontSize: 12,
    fontWeight: "600",
  },
  labelActive: {
    color: colors.buttonSecondaryText,
  },
});
