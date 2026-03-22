import React from "react";
import { StyleSheet, TextInput, View } from "react-native";
import { AppIcon } from "../components";
import { radius, spacing } from "../theme";

interface SearchBarProps {
  value: string;
  onChangeText: (value: string) => void;
  placeholder: string;
}

export function SearchBar({ value, onChangeText, placeholder }: SearchBarProps) {
  return (
    <View style={styles.container}>
      <AppIcon name="search" size="sm" color="textSecondary" />
      <TextInput
        accessibilityLabel={placeholder}
        style={styles.input}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor="#6f7380"
        autoCapitalize="none"
        autoCorrect={false}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderWidth: 1,
    borderColor: "#2a2d34",
    borderRadius: radius.md,
    backgroundColor: "#0f1318",
    minHeight: 44,
    paddingHorizontal: spacing.md,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  input: {
    flex: 1,
    color: "#ffffff",
    fontSize: 14,
    paddingVertical: spacing.sm,
  },
});
