import React, { useRef, useState } from "react";
import { Pressable, ScrollView, StyleSheet, Text, TextInput, View } from "react-native";
import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { FeatureFlagKey, WidgetKey } from "@ambient/shared-contracts";
import { AppIcon } from "../../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../../shared/ui/theme";
import type { CreatableWidgetType } from "../adminHome.logic";
import { CREATABLE_WIDGET_TYPES } from "../adminHome.logic";

const DRAG_WIDGET_TYPE_MIME = "application/x-ambient-widget";
const DRAG_WIDGET_PAYLOAD_MIME = "application/x-ambient-widget-payload";
const LONG_PRESS_MS = 320;

const WIDGET_ICON: Record<WidgetKey, "clock" | "weather" | "calendar"> = {
  clockDate: "clock",
  weather: "weather",
  calendar: "calendar",
};

interface WidgetLibraryPanelProps {
  selectedLibraryWidgetType: CreatableWidgetType | null;
  hasFeature: (key: FeatureFlagKey) => boolean;
  onSelectLibraryWidget: (type: CreatableWidgetType) => void;
  onUpgradePress: () => void;
}

export function WidgetLibraryPanel({
  selectedLibraryWidgetType,
  hasFeature,
  onSelectLibraryWidget,
  onUpgradePress,
}: WidgetLibraryPanelProps) {
  const [search, setSearch] = useState("");
  const [armedWidgetType, setArmedWidgetType] = useState<CreatableWidgetType | null>(null);
  const [draggingWidgetType, setDraggingWidgetType] = useState<CreatableWidgetType | null>(null);
  const pressStateRef = useRef<{
    widgetType: CreatableWidgetType;
    startedAt: number;
    timer: ReturnType<typeof setTimeout> | null;
    longPressArmed: boolean;
  } | null>(null);

  const filtered = CREATABLE_WIDGET_TYPES.filter((key) => {
    const name = widgetBuiltinDefinitions[key].manifest.name.toLowerCase();
    return name.includes(search.toLowerCase()) || key.toLowerCase().includes(search.toLowerCase());
  });

  function clearPressTimer() {
    if (pressStateRef.current?.timer) {
      clearTimeout(pressStateRef.current.timer);
    }
  }

  function beginPress(widgetType: CreatableWidgetType) {
    clearPressTimer();
    const startedAt = Date.now();
    const timer = setTimeout(() => {
      if (!pressStateRef.current || pressStateRef.current.widgetType !== widgetType) return;
      pressStateRef.current.longPressArmed = true;
      setArmedWidgetType(widgetType);
    }, LONG_PRESS_MS);

    pressStateRef.current = {
      widgetType,
      startedAt,
      timer,
      longPressArmed: false,
    };
  }

  function endPress(widgetType: CreatableWidgetType) {
    if (!pressStateRef.current || pressStateRef.current.widgetType !== widgetType) return;
    clearPressTimer();
    if (draggingWidgetType !== widgetType) {
      setArmedWidgetType(null);
    }
    pressStateRef.current = null;
  }

  return (
    <View style={styles.panel}>
      <View style={styles.searchRow}>
        <AppIcon name="search" size="sm" color="textSecondary" />
        <TextInput
          style={styles.searchInput}
          value={search}
          onChangeText={setSearch}
          placeholder="Search widgets…"
          placeholderTextColor={colors.textSecondary}
          accessibilityLabel="Search widget library"
        />
      </View>

      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {filtered.length === 0 ? (
          <Text style={styles.emptyText}>No widgets match "{search}"</Text>
        ) : (
          filtered.map((widgetKey) => {
            const manifest = widgetBuiltinDefinitions[widgetKey].manifest;
            const isPremium = manifest.premium === true;
            const locked = isPremium && !hasFeature("premium_widgets");
            const draggable = !locked;
            const isSelected = selectedLibraryWidgetType === widgetKey;
            const isArmed = armedWidgetType === widgetKey;
            const isDragging = draggingWidgetType === widgetKey;

            return (
              <Pressable
                key={widgetKey}
                accessibilityRole="button"
                accessibilityLabel={`${manifest.name} widget`}
                style={[
                  styles.widgetRow,
                  isSelected ? styles.widgetRowSelected : null,
                  isArmed ? styles.widgetRowArmed : null,
                  isDragging ? styles.widgetRowDragging : null,
                  // web-only cursor — ignored on native
                  { cursor: draggable ? "grab" : "default" } as object,
                ]}
                onPress={() => {
                  if (locked) {
                    onUpgradePress();
                    return;
                  }
                  if (pressStateRef.current?.widgetType === widgetKey && pressStateRef.current.longPressArmed) {
                    return;
                  }
                  onSelectLibraryWidget(widgetKey);
                }}
                {...({
                  onMouseDown: () => {
                    if (locked) return;
                    beginPress(widgetKey);
                  },
                  onMouseUp: () => endPress(widgetKey),
                  onMouseLeave: () => endPress(widgetKey),
                  onTouchStart: () => {
                    if (locked) return;
                    beginPress(widgetKey);
                  },
                  onTouchEnd: () => endPress(widgetKey),
                  onTouchCancel: () => endPress(widgetKey),
                } as object)}
                // HTML5 Drag-and-Drop — web only, passed through by React Native Web
                {...(draggable
                  ? ({
                      draggable: true,
                      onDragStart: (event: DragEvent) => {
                        const pressState = pressStateRef.current;
                        const longPressReached = Boolean(
                          pressState
                          && pressState.widgetType === widgetKey
                          && (pressState.longPressArmed || Date.now() - pressState.startedAt >= LONG_PRESS_MS),
                        );
                        if (!longPressReached) {
                          event.preventDefault();
                          return;
                        }
                        clearPressTimer();

                        const defaultLayout = manifest.defaultLayout;
                        const payload = JSON.stringify({
                          widgetType: widgetKey,
                          defaultLayout: {
                            w: defaultLayout.w,
                            h: defaultLayout.h,
                          },
                        });
                        event.dataTransfer?.setData(DRAG_WIDGET_TYPE_MIME, widgetKey);
                        event.dataTransfer?.setData(DRAG_WIDGET_PAYLOAD_MIME, payload);
                        event.dataTransfer?.setData("text/plain", widgetKey);
                        if (event.dataTransfer) {
                          event.dataTransfer.effectAllowed = "copy";
                        }
                        setDraggingWidgetType(widgetKey);
                        setArmedWidgetType(null);
                      },
                      onDragEnd: () => {
                        setDraggingWidgetType(null);
                        setArmedWidgetType(null);
                        pressStateRef.current = null;
                      },
                    } as object)
                  : undefined)}
              >
                <View style={styles.widgetInfo}>
                  <AppIcon name={WIDGET_ICON[widgetKey]} size="sm" color="textSecondary" />
                  <View style={styles.widgetTextBlock}>
                    <Text style={styles.widgetName}>{manifest.name}</Text>
                    <Text style={styles.widgetCategory}>{manifest.category}</Text>
                  </View>
                </View>
                <View style={styles.widgetActions}>
                  {locked ? (
                    <Text style={styles.premiumLabel}>Pro</Text>
                  ) : isDragging ? (
                    <Text style={styles.draggingLabel}>Dragging…</Text>
                  ) : null}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    flex: 1,
    minHeight: 0,
  },
  searchRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  searchInput: {
    flex: 1,
    color: colors.textPrimary,
    fontSize: typography.small.fontSize,
    paddingVertical: 6,
  },
  list: {
    flex: 1,
  },
  listContent: {
    gap: 2,
    paddingVertical: spacing.sm,
  },
  emptyText: {
    ...typography.small,
    color: colors.textSecondary,
    textAlign: "center",
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  widgetRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  widgetRowSelected: {
    backgroundColor: colors.surfaceInput,
  },
  widgetRowArmed: {
    borderLeftWidth: 2,
    borderLeftColor: colors.accentBlue,
    backgroundColor: colors.statusInfoBg,
  },
  widgetRowDragging: {
    opacity: 0.75,
  },
  widgetInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.sm,
  },
  widgetTextBlock: {
    flex: 1,
    gap: 1,
  },
  widgetName: {
    ...typography.small,
    color: colors.textPrimary,
    fontWeight: "600",
  },
  widgetCategory: {
    fontSize: 11,
    color: colors.textSecondary,
    textTransform: "capitalize",
  },
  widgetActions: {
    alignItems: "flex-end",
  },
  draggingLabel: {
    ...typography.small,
    color: colors.textSecondary,
  },
  premiumLabel: {
    fontSize: 11,
    color: colors.statusWarningText,
    borderWidth: 1,
    borderColor: colors.statusPremiumBorder,
    backgroundColor: colors.statusPremiumBg,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    overflow: "hidden",
    fontWeight: "700",
  },
});
