import React, { useState } from "react";
import {
  StyleSheet,
  TextInput as RNTextInput,
  type TextInputProps as RNTextInputProps,
  type StyleProp,
  type TextStyle,
} from "react-native";
import { Text } from "./Text";
import { colors, radius, spacing, typography } from "../theme";

interface TextInputProps extends RNTextInputProps {
  label?: string;
  hint?: string;
  error?: string | null;
  inputStyle?: StyleProp<TextStyle>;
}

export function TextInput({
  label,
  hint,
  error = null,
  inputStyle,
  style,
  accessibilityLabel,
  placeholderTextColor = colors.textSecondary,
  onFocus,
  onBlur,
  ...props
}: TextInputProps) {
  const [focused, setFocused] = useState(false);

  return (
    <>
      {label ? (
        <Text variant="caption" color="textSecondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <RNTextInput
        {...props}
        accessibilityLabel={accessibilityLabel ?? label ?? props.placeholder}
        placeholderTextColor={placeholderTextColor}
        style={[
          styles.input,
          focused ? styles.inputFocused : null,
          error ? styles.inputError : null,
          inputStyle,
          style,
        ]}
        onFocus={(event) => {
          setFocused(true);
          onFocus?.(event);
        }}
        onBlur={(event) => {
          setFocused(false);
          onBlur?.(event);
        }}
      />
      {error ? (
        <Text variant="caption" color="error">
          {error}
        </Text>
      ) : hint ? (
        <Text variant="caption" color="textSecondary">
          {hint}
        </Text>
      ) : null}
    </>
  );
}

const styles = StyleSheet.create({
  label: {
    marginBottom: spacing.xs,
  },
  input: {
    borderWidth: 1,
    borderColor: colors.borderInput,
    backgroundColor: colors.surfaceInput,
    borderRadius: radius.md,
    color: colors.textPrimary,
    paddingHorizontal: spacing.md,
    paddingVertical: 10,
    ...typography.label,
  },
  inputFocused: {
    borderColor: colors.accentBlue,
  },
  inputError: {
    borderColor: colors.error,
  },
});
