import React, { useCallback, useEffect, useRef, useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import type { LayoutChangeEvent } from "react-native";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { EmptyPanel } from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import { LayoutGrid } from "../../display/components/LayoutGrid";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import {
  DISPLAY_GRID_COLUMNS,
  DISPLAY_GRID_BASE_ROWS,
} from "../../display/components/LayoutGrid.logic";
import type { WidgetLayout } from "../../display/components/LayoutGrid.logic";
import { computeDropLayout, computeCanvasDropPlacement } from "./dropPosition.logic";
import type { CanvasDropPlacement } from "./dropPosition.logic";
import { CanvasDropPreview } from "./CanvasDropPreview";
import type { CreatableWidgetType } from "../adminHome.logic";
import { CREATABLE_WIDGET_TYPES } from "../adminHome.logic";
import { getWidgetDefaultSize } from "../widgetPlacement.logic";
import {
  MANUAL_WIDGET_DRAG_END_EVENT,
  MANUAL_WIDGET_DRAG_MOVE_EVENT,
  WIDGET_DRAG_CANVAS_HOVER_EVENT,
  type ManualWidgetDragDetail,
  type WidgetDragCanvasHoverDetail,
} from "./widgetManualDrag.events";

const DRAG_WIDGET_TYPE_MIME = "application/x-ambient-widget";
const DRAG_WIDGET_PAYLOAD_MIME = "application/x-ambient-widget-payload";

interface DragWidgetPayload {
  widgetType: CreatableWidgetType;
  defaultLayout?: {
    w: number;
    h: number;
  };
}

function parseDragWidgetPayload(dataTransfer: DataTransfer | null | undefined): DragWidgetPayload | null {
  const payload = dataTransfer?.getData(DRAG_WIDGET_PAYLOAD_MIME);
  if (!payload) return null;

  try {
    const parsed = JSON.parse(payload) as Partial<DragWidgetPayload>;
    if (!parsed.widgetType || !CREATABLE_WIDGET_TYPES.includes(parsed.widgetType)) {
      return null;
    }
    return parsed as DragWidgetPayload;
  } catch {
    return null;
  }
}

function getDraggedWidgetType(dataTransfer: DataTransfer | null | undefined): CreatableWidgetType | null {
  const payload = parseDragWidgetPayload(dataTransfer);
  if (payload?.widgetType) return payload.widgetType;

  const widgetType = dataTransfer?.getData(DRAG_WIDGET_TYPE_MIME)
    || dataTransfer?.getData("text/plain")
    || undefined;
  if (!widgetType || !CREATABLE_WIDGET_TYPES.includes(widgetType as CreatableWidgetType)) {
    return null;
  }
  return widgetType as CreatableWidgetType;
}

function canAcceptWidgetDrag(dataTransfer: DataTransfer | null | undefined): boolean {
  if (!dataTransfer) return false;

  const dragTypes = Array.from(dataTransfer.types ?? []);
  if (
    dragTypes.includes(DRAG_WIDGET_PAYLOAD_MIME)
    || dragTypes.includes(DRAG_WIDGET_TYPE_MIME)
  ) {
    return true;
  }

  // Fallback for browsers that omit custom MIME types in `types`.
  return getDraggedWidgetType(dataTransfer) !== null;
}

interface DashboardCanvasProps {
  widgets: DisplayLayoutWidgetEnvelope[];
  selectedWidgetId: string | null;
  onSelectWidget: (widgetId: string) => void;
  onClearSelection: () => void;
  onWidgetLayoutChange: (widgetId: string, layout: WidgetLayout) => void;
  onRemoveWidget?: (widgetId: string) => void;
  loadingLayout: boolean;
  error: string | null;
  onRetry: () => void;
  hasLayoutChanges: boolean;
  savingLayout: boolean;
  layoutError: string | null;
  widgetPlacementError?: string | null;
  onSaveLayout: () => void;
  onCancelLayout: () => void;
  /** Called when a widget type is dropped onto the canvas with a resolved grid layout. */
  onWidgetDropped?: (widgetType: CreatableWidgetType, layout: WidgetLayout) => void;
}

export function DashboardCanvas({
  widgets,
  selectedWidgetId,
  onSelectWidget,
  onClearSelection,
  onWidgetLayoutChange,
  onRemoveWidget,
  loadingLayout,
  error,
  onRetry,
  hasLayoutChanges,
  savingLayout,
  layoutError,
  widgetPlacementError,
  onSaveLayout,
  onCancelLayout,
  onWidgetDropped,
}: DashboardCanvasProps) {
  const hasWidgets = widgets.length > 0;
  const [isDragOver, setIsDragOver] = useState(false);
  const [dropPreview, setDropPreview] = useState<CanvasDropPlacement | null>(null);
  const [canvasDimensions, setCanvasDimensions] = useState({ width: 0, height: 0 });
  const canvasBodyRef = useRef<HTMLElement | null>(null);

  function dispatchCanvasHover(isOverCanvas: boolean) {
    if (typeof window === "undefined") return;
    window.dispatchEvent(
      new CustomEvent<WidgetDragCanvasHoverDetail>(WIDGET_DRAG_CANVAS_HOVER_EVENT, {
        detail: { isOverCanvas },
      }),
    );
  }

  const handleCanvasLayout = useCallback((event: LayoutChangeEvent) => {
    const { width, height } = event.nativeEvent.layout;
    setCanvasDimensions((prev) => {
      if (prev.width === width && prev.height === height) return prev;
      return { width, height };
    });
  }, []);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragOver(false);
    setDropPreview(null);
    dispatchCanvasHover(false);

    if (!canAcceptWidgetDrag(event.dataTransfer)) {
      return;
    }

    const widgetType = getDraggedWidgetType(event.dataTransfer);
    if (!widgetType) {
      return;
    }
    const dragPayload = parseDragWidgetPayload(event.dataTransfer);

    // Use getBoundingClientRect for pixel-accurate canvas-relative coords
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;

    const existingLayoutsById = Object.fromEntries(
      widgets.map((w) => [w.widgetInstanceId, w.layout]),
    );

    const defaultSize = dragPayload?.defaultLayout
      ? {
          w: dragPayload.defaultLayout.w,
          h: dragPayload.defaultLayout.h,
        }
      : getWidgetDefaultSize(widgetType);
    const layout = computeDropLayout({
      dropX,
      dropY,
      containerWidth: rect.width,
      containerHeight: rect.height,
      existingLayoutsById,
      widgetW: defaultSize.w,
      widgetH: defaultSize.h,
    });

    onWidgetDropped?.(widgetType, layout);
  }

  function handleManualDrop(detail: ManualWidgetDragDetail) {
    const target = canvasBodyRef.current;
    if (!target) return;

    setDropPreview(null);
    dispatchCanvasHover(false);

    const rect = target.getBoundingClientRect();
    const isInside = (
      detail.clientX >= rect.left
      && detail.clientX <= rect.right
      && detail.clientY >= rect.top
      && detail.clientY <= rect.bottom
    );
    if (!isInside) {
      return;
    }

    const existingLayoutsById = Object.fromEntries(
      widgets.map((w) => [w.widgetInstanceId, w.layout]),
    );
    const defaultSize = detail.defaultLayout
      ? {
          w: detail.defaultLayout.w,
          h: detail.defaultLayout.h,
        }
      : getWidgetDefaultSize(detail.widgetType);

    const dropX = detail.clientX - rect.left;
    const dropY = detail.clientY - rect.top;
    const layout = computeDropLayout({
      dropX,
      dropY,
      containerWidth: rect.width,
      containerHeight: rect.height,
      existingLayoutsById,
      widgetW: defaultSize.w,
      widgetH: defaultSize.h,
    });
    onWidgetDropped?.(detail.widgetType, layout);
  }

  useEffect(() => {
    if (typeof window === "undefined") return;

    function onManualMove(event: Event) {
      const customEvent = event as CustomEvent<ManualWidgetDragDetail>;
      const detail = customEvent.detail;
      const target = canvasBodyRef.current;
      if (!target) return;

      const rect = target.getBoundingClientRect();
      const isInside = (
        detail.clientX >= rect.left
        && detail.clientX <= rect.right
        && detail.clientY >= rect.top
        && detail.clientY <= rect.bottom
      );

      if (isInside) {
        const existingLayoutsById = Object.fromEntries(
          widgets.map((w) => [w.widgetInstanceId, w.layout]),
        );
        const defaultSize = detail.defaultLayout ?? getWidgetDefaultSize(detail.widgetType);
        const placement = computeCanvasDropPlacement({
          dropX: detail.clientX - rect.left,
          dropY: detail.clientY - rect.top,
          containerWidth: rect.width,
          containerHeight: rect.height,
          existingLayoutsById,
          widgetW: defaultSize.w,
          widgetH: defaultSize.h,
        });
        setDropPreview(placement);
        dispatchCanvasHover(true);
      } else {
        setDropPreview(null);
        dispatchCanvasHover(false);
      }

      setIsDragOver(isInside);
    }

    function onManualEnd(event: Event) {
      const customEvent = event as CustomEvent<ManualWidgetDragDetail>;
      const detail = customEvent.detail;
      handleManualDrop(detail);
      setIsDragOver(false);
    }

    window.addEventListener(MANUAL_WIDGET_DRAG_MOVE_EVENT, onManualMove as EventListener);
    window.addEventListener(MANUAL_WIDGET_DRAG_END_EVENT, onManualEnd as EventListener);

    return () => {
      window.removeEventListener(MANUAL_WIDGET_DRAG_MOVE_EVENT, onManualMove as EventListener);
      window.removeEventListener(MANUAL_WIDGET_DRAG_END_EVENT, onManualEnd as EventListener);
    };
  }, [onWidgetDropped, widgets]);

  // Web-only DnD event handlers spread onto the canvas body View
  const dropZoneProps = {
    onDragEnter: (event: DragEvent) => {
      event.preventDefault();
      const acceptsDrag = canAcceptWidgetDrag(event.dataTransfer);
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = acceptsDrag ? "copy" : "none";
      }
      if (acceptsDrag) {
        dispatchCanvasHover(true);
      }
      setIsDragOver(acceptsDrag);
    },
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      const acceptsDrag = canAcceptWidgetDrag(event.dataTransfer);
      if (!acceptsDrag) {
        if (event.dataTransfer) {
          event.dataTransfer.dropEffect = "none";
        }
        setIsDragOver(false);
        setDropPreview(null);
        dispatchCanvasHover(false);
        return;
      }
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setIsDragOver(true);

      // Compute snapped preview for canvas drop indicator
      const target = event.currentTarget as HTMLElement;
      const rect = target.getBoundingClientRect();
      const widgetType = getDraggedWidgetType(event.dataTransfer);
      if (widgetType) {
        const dragPayload = parseDragWidgetPayload(event.dataTransfer);
        const defaultSize = dragPayload?.defaultLayout ?? getWidgetDefaultSize(widgetType);
        const existingLayoutsById = Object.fromEntries(
          widgets.map((w) => [w.widgetInstanceId, w.layout]),
        );
        const placement = computeCanvasDropPlacement({
          dropX: event.clientX - rect.left,
          dropY: event.clientY - rect.top,
          containerWidth: rect.width,
          containerHeight: rect.height,
          existingLayoutsById,
          widgetW: defaultSize.w,
          widgetH: defaultSize.h,
        });
        setDropPreview(placement);
      }
    },
    onDragLeave: (event: DragEvent) => {
      // Only clear when leaving the container itself, not child elements
      const relatedTarget = event.relatedTarget as Node | null;
      const currentTarget = event.currentTarget as HTMLElement;
      if (!currentTarget.contains(relatedTarget)) {
        setIsDragOver(false);
        setDropPreview(null);
        dispatchCanvasHover(false);
      }
    },
    onDrop: handleDrop,
  } as object;

  return (
    <View style={styles.canvas}>
      {/* Top bar: canvas label + save/reset actions */}
      <View style={styles.canvasTopBar}>
        <Text style={styles.canvasLabel}>
          Canvas{isDragOver ? " — drop to place" : ""}
        </Text>
        <View style={styles.canvasActions}>
          {hasLayoutChanges ? (
            <>
              <Pressable
                accessibilityRole="button"
                style={[styles.actionButton, styles.cancelButton]}
                onPress={onCancelLayout}
                disabled={savingLayout}
              >
                <Text style={styles.cancelLabel}>Reset</Text>
              </Pressable>
              <Pressable
                accessibilityRole="button"
                style={[
                  styles.actionButton,
                  styles.saveButton,
                  savingLayout ? styles.actionDisabled : null,
                ]}
                onPress={onSaveLayout}
                disabled={savingLayout}
              >
                <Text style={styles.saveLabel}>
                  {savingLayout ? "Saving…" : "Save Layout"}
                </Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      {/* Drop zone — covers both empty canvas and populated grid */}
      <View
        ref={(node) => {
          canvasBodyRef.current = node as unknown as HTMLElement | null;
        }}
        style={[styles.canvasBody, isDragOver ? styles.canvasBodyDragOver : null]}
        onLayout={handleCanvasLayout}
        {...dropZoneProps}
      >
        {loadingLayout && !hasWidgets ? (
          <EmptyPanel
            variant="loading"
            title="Loading canvas"
            message="Fetching your widget layout."
          />
        ) : error && !hasWidgets ? (
          <ErrorState message={error} onRetry={onRetry} />
        ) : !hasWidgets ? (
          <View style={styles.emptyCanvas}>
            <View
              style={[
                styles.emptyPlaceholder,
                isDragOver ? styles.emptyPlaceholderDragOver : null,
              ]}
            >
              <Text style={styles.emptyTitle}>
                {isDragOver ? "Release to add widget" : "Canvas is empty"}
              </Text>
              <Text style={styles.emptyMessage}>
                {isDragOver
                  ? "The widget will be placed at this position."
                  : "Long press and drag a widget from the sidebar to place it here."}
              </Text>
            </View>
          </View>
        ) : (
          <LayoutGrid
            widgets={widgets}
            editMode
            selectedWidgetId={selectedWidgetId}
            onSelectWidget={onSelectWidget}
            onClearWidgetSelection={onClearSelection}
            onWidgetLayoutChange={onWidgetLayoutChange}
            onRemoveWidget={onRemoveWidget}
          />
        )}

        {/* Snapped grid placement preview — shown over both empty canvas and grid */}
        {dropPreview && canvasDimensions.width > 0 ? (
          <CanvasDropPreview
            layout={dropPreview.layout}
            containerWidth={canvasDimensions.width}
            containerHeight={canvasDimensions.height}
            isValid={dropPreview.isValid}
          />
        ) : null}

        {/* Drop overlay hint shown over the grid when dragging (no snapped preview) */}
        {isDragOver && hasWidgets && !dropPreview ? (
          <View style={styles.dragOverlay} pointerEvents="none">
            <Text style={styles.dragOverlayText}>Release to place widget</Text>
          </View>
        ) : null}
      </View>

      {/* Layout error banner */}
      {(layoutError || widgetPlacementError) ? (
        <View style={styles.errorBanner}>
          <ErrorState compact message={layoutError ?? widgetPlacementError ?? ""} />
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  canvas: {
    flex: 1,
    backgroundColor: colors.backgroundPrimary,
    flexDirection: "column",
  },
  canvasTopBar: {
    height: 44,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.6)",
  },
  canvasLabel: {
    fontSize: 11,
    color: colors.textSecondary,
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: 0.8,
  },
  canvasActions: {
    flexDirection: "row",
    gap: spacing.sm,
    alignItems: "center",
  },
  actionButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderWidth: 1,
    borderRadius: radius.md,
  },
  cancelButton: {
    borderColor: colors.border,
    backgroundColor: "rgba(0,0,0,0.8)",
  },
  saveButton: {
    borderColor: colors.accentBlue,
    backgroundColor: "rgba(18, 49, 76, 0.95)",
  },
  actionDisabled: {
    opacity: 0.5,
  },
  cancelLabel: {
    ...typography.small,
    color: colors.textSecondary,
    fontWeight: "600",
  },
  saveLabel: {
    ...typography.small,
    color: colors.statusInfoText,
    fontWeight: "600",
  },
  canvasBody: {
    flex: 1,
    position: "relative",
    padding: spacing.sm,
    backgroundColor: colors.backgroundScreen,
  },
  canvasBodyDragOver: {
    borderWidth: 2,
    borderColor: colors.accentBlue,
    borderStyle: "dashed",
  },
  emptyCanvas: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyPlaceholder: {
    maxWidth: 360,
    padding: spacing.xl,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    alignItems: "center",
    gap: spacing.sm,
  },
  emptyPlaceholderDragOver: {
    borderColor: colors.accentBlue,
    backgroundColor: colors.statusInfoBg,
  },
  emptyTitle: {
    ...typography.body,
    color: colors.textSecondary,
    fontWeight: "700",
  },
  emptyMessage: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    lineHeight: 20,
  },
  dragOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(18, 49, 76, 0.35)",
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 2,
    borderColor: colors.accentBlue,
    borderStyle: "dashed",
  },
  dragOverlayText: {
    ...typography.body,
    color: colors.statusInfoText,
    fontWeight: "700",
    backgroundColor: "rgba(0,0,0,0.7)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    overflow: "hidden",
  },
  errorBanner: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
});
