import React, { useEffect, useRef, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { WidgetKey } from "@ambient/shared-contracts";
import { AppIcon } from "../../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { CreatableWidgetType } from "../adminHome.logic";
import {
  MANUAL_WIDGET_DRAG_MOVE_EVENT,
  MANUAL_WIDGET_DRAG_END_EVENT,
  WIDGET_DRAG_START_EVENT,
  WIDGET_DRAG_CANVAS_HOVER_EVENT,
  type ManualWidgetDragDetail,
  type WidgetDragStartDetail,
  type WidgetDragCanvasHoverDetail,
} from "./widgetManualDrag.events";

const WIDGET_ICON: Record<WidgetKey, "clock" | "weather" | "calendar"> = {
  clockDate: "clock",
  weather: "weather",
  calendar: "calendar",
};

/** Cursor offset so the preview doesn't sit directly under the pointer. */
const OFFSET_X = 16;
const OFFSET_Y = -12;

interface PreviewState {
  active: boolean;
  widgetType: CreatableWidgetType | null;
  clientX: number;
  clientY: number;
  isOverCanvas: boolean;
}

/**
 * Fixed-position floating skeleton that follows the cursor while dragging a widget
 * from the library. Hides itself when the cursor is over the canvas (the canvas
 * shows its own snapped CanvasDropPreview instead).
 *
 * Handles both the manual-drag path (custom window events) and the HTML5 DnD path
 * (document dragover + WIDGET_DRAG_START_EVENT).
 */
export function WidgetDragPreviewOverlay() {
  const [state, setState] = useState<PreviewState>({
    active: false,
    widgetType: null,
    clientX: 0,
    clientY: 0,
    isOverCanvas: false,
  });

  const html5ActiveRef = useRef(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    // ---- Manual drag path ----
    function onManualMove(event: Event) {
      const detail = (event as CustomEvent<ManualWidgetDragDetail>).detail;
      setState((prev) => ({
        ...prev,
        active: true,
        widgetType: detail.widgetType,
        clientX: detail.clientX,
        clientY: detail.clientY,
      }));
    }

    function onManualEnd() {
      html5ActiveRef.current = false;
      setState({ active: false, widgetType: null, clientX: 0, clientY: 0, isOverCanvas: false });
    }

    // ---- HTML5 drag path ----
    function onDragStart(event: Event) {
      const detail = (event as CustomEvent<WidgetDragStartDetail>).detail;
      html5ActiveRef.current = true;
      setState((prev) => ({
        ...prev,
        active: true,
        widgetType: detail.widgetType,
      }));
    }

    function onDocumentDragOver(event: DragEvent) {
      if (!html5ActiveRef.current) return;
      setState((prev) => ({
        ...prev,
        clientX: event.clientX,
        clientY: event.clientY,
      }));
    }

    function onDocumentDragEnd() {
      if (!html5ActiveRef.current) return;
      html5ActiveRef.current = false;
      setState({ active: false, widgetType: null, clientX: 0, clientY: 0, isOverCanvas: false });
    }

    // ---- Canvas hover state ----
    function onCanvasHover(event: Event) {
      const detail = (event as CustomEvent<WidgetDragCanvasHoverDetail>).detail;
      setState((prev) => ({ ...prev, isOverCanvas: detail.isOverCanvas }));
    }

    window.addEventListener(MANUAL_WIDGET_DRAG_MOVE_EVENT, onManualMove as EventListener);
    window.addEventListener(MANUAL_WIDGET_DRAG_END_EVENT, onManualEnd as EventListener);
    window.addEventListener(WIDGET_DRAG_START_EVENT, onDragStart as EventListener);
    window.addEventListener(WIDGET_DRAG_CANVAS_HOVER_EVENT, onCanvasHover as EventListener);
    document.addEventListener("dragover", onDocumentDragOver);
    document.addEventListener("dragend", onDocumentDragEnd);

    return () => {
      window.removeEventListener(MANUAL_WIDGET_DRAG_MOVE_EVENT, onManualMove as EventListener);
      window.removeEventListener(MANUAL_WIDGET_DRAG_END_EVENT, onManualEnd as EventListener);
      window.removeEventListener(WIDGET_DRAG_START_EVENT, onDragStart as EventListener);
      window.removeEventListener(WIDGET_DRAG_CANVAS_HOVER_EVENT, onCanvasHover as EventListener);
      document.removeEventListener("dragover", onDocumentDragOver);
      document.removeEventListener("dragend", onDocumentDragEnd);
    };
  }, []);

  if (!state.active || !state.widgetType) return null;

  // When over the canvas, the canvas renders its own snapped CanvasDropPreview.
  // Hide the floating overlay to avoid visual overlap.
  if (state.isOverCanvas) return null;

  const manifest = widgetBuiltinDefinitions[state.widgetType]?.manifest;
  const iconName = WIDGET_ICON[state.widgetType];

  return (
    <View
      pointerEvents="none"
      style={[
        styles.root,
        {
          left: state.clientX + OFFSET_X,
          top: state.clientY + OFFSET_Y,
        } as object,
      ]}
    >
      <View style={styles.card}>
        {iconName ? <AppIcon name={iconName} size="sm" color="textSecondary" /> : null}
        {manifest ? <Text style={styles.name}>{manifest.name}</Text> : null}
      </View>
      <Text style={styles.hint}>Release over canvas to place</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    // fixed positioning is valid on React Native Web
    position: "fixed" as unknown as "absolute",
    zIndex: 9999,
    alignItems: "flex-start",
    gap: spacing.xs,
  },
  card: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    backgroundColor: colors.surfaceCard,
    borderWidth: 2,
    borderColor: colors.accentBlue,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    opacity: 0.9,
  },
  name: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  hint: {
    fontSize: 11,
    color: colors.textSecondary,
    marginLeft: spacing.xs,
  },
});
