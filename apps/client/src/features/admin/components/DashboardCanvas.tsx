import React from "react";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { ErrorState } from "../../../shared/ui/ErrorState";
import { EmptyPanel } from "../../../shared/ui/management";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import { LayoutGrid } from "../../display/components/LayoutGrid";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import type { WidgetLayout } from "../../display/components/LayoutGrid.logic";

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
}: DashboardCanvasProps) {
  const hasWidgets = widgets.length > 0;

  return (
    <View style={styles.canvas}>
      {/* Save / Cancel overlay */}
      <View style={styles.canvasTopBar}>
        <Text style={styles.canvasLabel}>Canvas</Text>
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
                style={[styles.actionButton, styles.saveButton, savingLayout ? styles.actionDisabled : null]}
                onPress={onSaveLayout}
                disabled={savingLayout}
              >
                <Text style={styles.saveLabel}>{savingLayout ? "Saving…" : "Save Layout"}</Text>
              </Pressable>
            </>
          ) : null}
        </View>
      </View>

      {/* Canvas content */}
      <View style={styles.canvasBody}>
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
            <View style={styles.emptyPlaceholder}>
              <Text style={styles.emptyTitle}>Canvas is empty</Text>
              <Text style={styles.emptyMessage}>
                Add widgets from the sidebar to start building your dashboard.
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
  errorBanner: {
    position: "absolute",
    bottom: spacing.lg,
    left: spacing.lg,
    right: spacing.lg,
  },
});
