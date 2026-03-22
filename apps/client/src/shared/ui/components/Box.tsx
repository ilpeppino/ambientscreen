import React from "react";
import type { StyleProp, ViewStyle } from "react-native";
import { View, type ViewProps } from "react-native";
import {
  colors,
  radius,
  spacing,
  type ColorToken,
  type RadiusToken,
  type SpacingToken,
} from "../theme";

interface BoxProps extends ViewProps {
  padding?: SpacingToken;
  backgroundColor?: ColorToken;
  borderRadius?: RadiusToken;
  style?: StyleProp<ViewStyle>;
}

export function Box({
  padding,
  backgroundColor,
  borderRadius,
  style,
  ...rest
}: BoxProps) {
  return (
    <View
      style={[
        padding ? { padding: spacing[padding] } : null,
        backgroundColor ? { backgroundColor: colors[backgroundColor] } : null,
        borderRadius ? { borderRadius: radius[borderRadius] } : null,
        style,
      ]}
      {...rest}
    />
  );
}
