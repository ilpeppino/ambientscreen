import React from "react";
import type { WidgetDataState } from "@ambient/shared-contracts";
import type { AppIconName } from "../../shared/ui/components";
import { WidgetHeader, WidgetState, type WidgetStateType, WidgetSurface } from "../../shared/ui/widgets";
import { StyleSheet, View, type StyleProp, type ViewStyle } from "react-native";
import { spacing } from "../../shared/ui/theme";

interface BaseWidgetFrameProps {
  title: string;
  icon: AppIconName;
  state: WidgetDataState;
  hasData: boolean;
  children?: React.ReactNode;
  emptyMessage?: string;
  errorMessage?: string;
  mode?: "display" | "edit";
  isSelected?: boolean;
  surfaceStyle?: StyleProp<ViewStyle>;
  contentStyle?: StyleProp<ViewStyle>;
}

function resolveWidgetStateType(state: WidgetDataState, hasData: boolean): WidgetStateType | null {
  if (state === "error") {
    return "error";
  }

  if (state === "empty" || hasData === false) {
    return "empty";
  }

  return null;
}

export function BaseWidgetFrame({
  title,
  icon,
  state,
  hasData,
  children,
  emptyMessage,
  errorMessage,
  mode = "display",
  isSelected = false,
  surfaceStyle,
  contentStyle,
}: BaseWidgetFrameProps) {
  const stateType = resolveWidgetStateType(state, hasData);

  return (
    <WidgetSurface mode={mode} isSelected={isSelected} style={[styles.surface, surfaceStyle]}>
      <WidgetHeader mode={mode} icon={icon} title={title} />
      <View style={[styles.content, contentStyle]}>
        {stateType ? (
          <WidgetState
            compact
            type={stateType}
            message={stateType === "error" ? errorMessage : emptyMessage}
          />
        ) : children}
      </View>
    </WidgetSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
  },
  content: {
    flex: 1,
  },
});
