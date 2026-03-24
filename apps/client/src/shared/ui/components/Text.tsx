import React from "react";
import type { StyleProp, TextStyle } from "react-native";
import { Text as RNText, type TextProps as RNTextProps } from "react-native";
import {
  colors,
  typography,
  type ColorToken,
  type TypographyToken,
} from "../theme";

interface TextProps extends RNTextProps {
  variant?: TypographyToken;
  color?: ColorToken;
  style?: StyleProp<TextStyle>;
}

export function Text({
  variant = "body",
  color = "textPrimary",
  style,
  ...rest
}: TextProps) {
  return (
    <RNText
      style={[
        typography[variant],
        {
          color: colors[color],
        },
        style,
      ]}
      {...rest}
    />
  );
}
