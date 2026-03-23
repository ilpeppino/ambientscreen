import React from "react";
import type { WidgetDataState } from "@ambient/shared-contracts";
import type { AppIconName } from "../../shared/ui/components";
import { WidgetHeader, WidgetState, type WidgetStateType, WidgetSurface } from "../../shared/ui/widgets";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
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
  stateContentStyle?: StyleProp<ViewStyle>;
  onContentLayout?: (event: LayoutChangeEvent) => void;
}

const DEBUG_WIDGET_BOUNDS = process.env.EXPO_PUBLIC_DEBUG_WIDGET_BOUNDS === "1";

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
  stateContentStyle,
  onContentLayout,
}: BaseWidgetFrameProps) {
  const stateType = resolveWidgetStateType(state, hasData);

  return (
    <WidgetSurface mode={mode} isSelected={isSelected} style={[styles.surface, surfaceStyle]}>
      <WidgetHeader mode={mode} icon={icon} title={title} />
      <View
        style={[
          styles.content,
          DEBUG_WIDGET_BOUNDS ? styles.debugContent : null,
          contentStyle,
        ]}
        onLayout={onContentLayout}
      >
        {stateType ? (
          <View style={[styles.stateContent, stateContentStyle]}>
            <WidgetState
              compact
              type={stateType}
              message={stateType === "error" ? errorMessage : emptyMessage}
            />
          </View>
        ) : children}
      </View>
    </WidgetSurface>
  );
}

const styles = StyleSheet.create({
  surface: {
    flex: 1,
    minHeight: 0,
    padding: spacing.md,
  },
  content: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    paddingVertical: spacing.sm,
    overflow: "hidden",
  },
  stateContent: {
    flex: 1,
  },
  debugContent: {
    borderColor: "#8B5CF6",
    borderWidth: 1,
  },
});
