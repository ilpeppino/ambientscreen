import React from "react";
import type { WidgetDataState, WidgetRenderContext } from "@ambient/shared-contracts";
import type { AppIconName } from "../../shared/ui/components";
import { WidgetHeader, WidgetState, type WidgetStateType, WidgetSurface } from "../../shared/ui/widgets";
import { StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native";
import { colors, spacing } from "../../shared/ui/theme";
import { deriveWidgetVisualScale, scaleBy } from "./widgetRenderContext";

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
  renderContext?: WidgetRenderContext;
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
  renderContext,
}: BaseWidgetFrameProps) {
  const stateType = resolveWidgetStateType(state, hasData);
  const visualScale = deriveWidgetVisualScale(renderContext);
  const isHeroLayout = renderContext?.sizeTier === "fullscreen";
  const fullscreenInsetTop = renderContext?.isFullscreen ? Math.round((renderContext.safeAreaInsets.top ?? 0) * 0.45) : 0;
  const fullscreenInsetBottom = renderContext?.isFullscreen ? Math.round((renderContext.safeAreaInsets.bottom ?? 0) * 0.45) : 0;
  const surfaceMode = isHeroLayout ? ("fullscreen" as const) : mode;

  return (
    <WidgetSurface
      mode={surfaceMode}
      isSelected={isSelected}
      style={[
        styles.surface,
        {
          paddingHorizontal: visualScale.framePadding,
          paddingTop: visualScale.framePadding + fullscreenInsetTop,
          paddingBottom: visualScale.framePadding + fullscreenInsetBottom,
        },
        surfaceStyle,
      ]}
    >
      {isHeroLayout ? null : <WidgetHeader mode={mode} icon={icon} title={title} />}
      <View
        style={[
          styles.content,
          {
            paddingVertical: isHeroLayout ? 0 : scaleBy(spacing.sm, visualScale.spacingScale, 2),
          },
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
    borderColor: colors.accentBlue,
    borderWidth: 1,
  },
});
