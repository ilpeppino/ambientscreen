import React, { useState } from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
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
import { computeDropLayout } from "./dropPosition.logic";
import type { CreatableWidgetType } from "../adminHome.logic";
import { CREATABLE_WIDGET_TYPES } from "../adminHome.logic";

interface DashboardCanvasProps {
  widgets: DisplayLayoutWidgetEnvelope[];
  selectedWidgetId: string | null;
  onSelectWidget: (widgetId: string) => void;
  onClearSelection: () => void;
  onWidgetLayoutChange: (widgetId: string, layout: WidgetLayout) => void;
  loadingLayout: boolean;
  error: string | null;
  onRetry: () => void;
  hasLayoutChanges: boolean;
  savingLayout: boolean;
  layoutError: string | null;
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
  loadingLayout,
  error,
  onRetry,
  hasLayoutChanges,
  savingLayout,
  layoutError,
  onSaveLayout,
  onCancelLayout,
  onWidgetDropped,
}: DashboardCanvasProps) {
  const hasWidgets = widgets.length > 0;
  const [isDragOver, setIsDragOver] = useState(false);

  function handleDrop(event: DragEvent) {
    event.preventDefault();
    setIsDragOver(false);

    const widgetType = event.dataTransfer?.getData("text/plain") as string | undefined;
    if (!widgetType || !CREATABLE_WIDGET_TYPES.includes(widgetType as CreatableWidgetType)) {
      return;
    }

    // Use getBoundingClientRect for pixel-accurate canvas-relative coords
    const target = event.currentTarget as HTMLElement;
    const rect = target.getBoundingClientRect();
    const dropX = event.clientX - rect.left;
    const dropY = event.clientY - rect.top;

    const existingLayoutsById = Object.fromEntries(
      widgets.map((w) => [w.widgetInstanceId, w.layout]),
    );

    const layout = computeDropLayout({
      dropX,
      dropY,
      containerWidth: rect.width,
      containerHeight: rect.height,
      existingLayoutsById,
    });

    onWidgetDropped?.(widgetType as CreatableWidgetType, layout);
  }

  // Web-only DnD event handlers spread onto the canvas body View
  const dropZoneProps = {
    onDragOver: (event: DragEvent) => {
      event.preventDefault();
      if (event.dataTransfer) {
        event.dataTransfer.dropEffect = "copy";
      }
      setIsDragOver(true);
    },
    onDragLeave: (event: DragEvent) => {
      // Only clear when leaving the container itself, not child elements
      const relatedTarget = event.relatedTarget as Node | null;
      const currentTarget = event.currentTarget as HTMLElement;
      if (!currentTarget.contains(relatedTarget)) {
        setIsDragOver(false);
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
        style={[styles.canvasBody, isDragOver ? styles.canvasBodyDragOver : null]}
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
                  : "Drag a widget from the sidebar or click + Add to place it here."}
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
          />
        )}

        {/* Drop overlay hint shown over the grid when dragging */}
        {isDragOver && hasWidgets ? (
          <View style={styles.dragOverlay} pointerEvents="none">
            <Text style={styles.dragOverlayText}>Release to place widget</Text>
          </View>
        ) : null}
      </View>

      {/* Layout error banner */}
      {layoutError ? (
        <View style={styles.errorBanner}>
          <ErrorState compact message={layoutError} />
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
    backgroundColor: "#050709",
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
