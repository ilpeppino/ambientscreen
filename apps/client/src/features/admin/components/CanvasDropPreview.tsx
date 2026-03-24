import React from "react";
import { StyleSheet, View } from "react-native";
import { computeLayoutFrame, type WidgetLayout } from "../../display/components/LayoutGrid.logic";
import { colors, radius } from "../../../shared/ui/theme";

interface CanvasDropPreviewProps {
  /** Grid layout to preview. */
  layout: WidgetLayout;
  /** Width of the canvas container in pixels. */
  containerWidth: number;
  /** Height of the canvas container in pixels. */
  containerHeight: number;
  /**
   * Whether the placement is collision-free at the desired position.
   * true → blue/valid style; false → red/invalid style (widget relocated to avoid collision).
   */
  isValid: boolean;
}

/**
 * Absolutely-positioned skeleton rectangle rendered inside DashboardCanvas
 * to show where a dragged widget will be placed on the grid.
 */
export function CanvasDropPreview({
  layout,
  containerWidth,
  containerHeight,
  isValid,
}: CanvasDropPreviewProps) {
  if (containerWidth <= 0 || containerHeight <= 0) return null;

  const frame = computeLayoutFrame({ layout, containerWidth, containerHeight });

  return (
    <View
      pointerEvents="none"
      style={[
        styles.preview,
        {
          left: frame.left,
          top: frame.top,
          width: frame.width,
          height: frame.height,
        },
        isValid ? styles.previewValid : styles.previewInvalid,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  preview: {
    position: "absolute",
    borderRadius: radius.md,
    borderWidth: 2,
  },
  previewValid: {
    backgroundColor: "rgba(45, 140, 255, 0.15)",
    borderColor: colors.accentBlue,
    // borderStyle: 'dashed' — not typed in RN StyleSheet but works on web
  },
  previewInvalid: {
    backgroundColor: "rgba(255, 107, 107, 0.10)",
    borderColor: colors.error,
  },
});
