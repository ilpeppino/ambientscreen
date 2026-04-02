import React from "react";
import { StyleSheet, View } from "react-native";
import type { WidgetRenderContext, WidgetRendererProps } from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";
import {
  computeRegionHeights,
  computeRegionInsets,
  computeRenderTokens,
  deriveWidgetVisualScale,
  fitTextToRegion,
  scaleBy,
} from "../shared/widgetRenderContext";

const SAFE_CONTEXT: WidgetRenderContext = {
  viewportWidth: 1,
  viewportHeight: 1,
  widgetWidth: 1,
  widgetHeight: 1,
  widthRatio: 1,
  heightRatio: 1,
  areaRatio: 1,
  orientation: "landscape",
  platform: "web",
  safeAreaInsets: { top: 0, right: 0, bottom: 0, left: 0 },
  isFullscreen: false,
  sizeTier: "regular",
};

export function TasksRenderer({ state, data, config, renderContext }: WidgetRendererProps<"tasks">) {
  const safeContext = renderContext ?? SAFE_CONTEXT;
  const visualScale = deriveWidgetVisualScale(safeContext);
  const tokens = computeRenderTokens(safeContext);
  const regions = computeRegionHeights(safeContext);
  const regionInsets = computeRegionInsets(regions, {
    supportTop: tokens.heroSupportGap,
    detailTop: tokens.supportDetailGap,
  });

  const displayMode = config.displayMode ?? "list";
  const tasks = data?.tasks ?? [];
  const lists = data?.lists ?? [];
  const hasData = tasks.length > 0;

  const heroTask = tasks[0] ?? null;

  const compactLimit = safeContext.sizeTier === "compact" ? 3 : 5;
  const modeLimit = displayMode === "compact"
    ? Math.min(compactLimit, 5)
    : displayMode === "focus"
    ? Math.min(8, Math.max(3, config.maxItems ?? 5))
    : Math.min(10, Math.max(3, config.maxItems ?? 5));

  const visibleTasks = tasks.slice(0, modeLimit);
  const detailTasks = displayMode === "focus" ? visibleTasks.slice(1) : visibleTasks;
  const groupedDetailTasks = displayMode === "list"
    ? detailTasks.reduce((accumulator, task) => {
      const key = task.sourceListName ?? "Tasks";
      const existing = accumulator.find((entry) => entry.listName === key);
      if (existing) {
        existing.tasks.push(task);
      } else {
        accumulator.push({ listName: key, tasks: [task] });
      }
      return accumulator;
    }, [] as Array<{ listName: string; tasks: typeof detailTasks }>)
    : [];

  const heroTitle = fitTextToRegion({
    targetFontSize: displayMode === "focus"
      ? Math.round(safeContext.widgetHeight * 0.11)
      : Math.round(safeContext.widgetHeight * 0.08),
    regionHeight: Math.max(1, Math.round(regions.hero * 0.72)),
    lines: displayMode === "focus" ? 2 : 1,
    minFontSize: 12,
    lineHeightRatio: 1.1,
  });

  const supportText = fitTextToRegion({
    targetFontSize: scaleBy(16, visualScale.typographyScale, 11),
    regionHeight: Math.max(1, Math.round(regions.support * 0.36)),
    lines: 1,
    minFontSize: 9,
    lineHeightRatio: 1.12,
  });

  const detailText = fitTextToRegion({
    targetFontSize: scaleBy(15, visualScale.typographyScale, 10),
    regionHeight: Math.max(1, Math.round((regions.detail - regionInsets.detailTop) / Math.max(1, detailTasks.length || 1))),
    lines: 1,
    minFontSize: 9,
    lineHeightRatio: 1.12,
  });

  return (
    <BaseWidgetFrame
      title="Tasks"
      icon="check"
      state={state}
      hasData={hasData}
      emptyMessage="No active tasks."
      errorMessage="Unable to load tasks."
      contentStyle={styles.content}
      renderContext={safeContext}
    >
      <View style={[styles.heroRegion, { flexBasis: regions.hero, minHeight: regions.hero }]}> 
        {heroTask ? (
          <View style={styles.heroCard}>
            <Text
              style={[styles.heroTitle, { fontSize: heroTitle.fontSize, lineHeight: heroTitle.lineHeight }]}
              numberOfLines={displayMode === "focus" ? 2 : 1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {heroTask.title}
            </Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.supportRegion, {
        flexBasis: regions.support,
        minHeight: regions.support,
        paddingTop: regionInsets.supportTop,
      }]}
      >
        {displayMode === "compact" ? null : (
          <Text style={[styles.supportText, { fontSize: supportText.fontSize, lineHeight: supportText.lineHeight }]} numberOfLines={1}>
            {lists.length > 0 ? `${lists.length} list${lists.length === 1 ? "" : "s"}` : "All lists"}
            {hasData ? ` • ${tasks.length} active` : ""}
          </Text>
        )}
      </View>

      <View style={[styles.detailRegion, {
        flexBasis: regions.detail,
        minHeight: regions.detail,
        paddingTop: regionInsets.detailTop,
        gap: scaleBy(tokens.itemGap, 1, 2),
      }]}
      >
        {displayMode === "list"
          ? groupedDetailTasks.map((group) => (
            <View key={group.listName} style={styles.groupBlock}>
              <Text
                style={[styles.groupTitle, { fontSize: Math.max(9, detailText.fontSize - 2), lineHeight: detailText.lineHeight }]}
                numberOfLines={1}
              >
                {group.listName}
              </Text>
              {group.tasks.map((task) => (
                <View key={task.id} style={styles.detailRow}>
                  <Text
                    style={[styles.detailTitle, { fontSize: detailText.fontSize, lineHeight: detailText.lineHeight }]}
                    numberOfLines={1}
                    ellipsizeMode="tail"
                  >
                    {task.title}
                  </Text>
                </View>
              ))}
            </View>
          ))
          : detailTasks.map((task) => (
            <View key={task.id} style={styles.detailRow}>
              <Text
                style={[styles.detailTitle, { fontSize: detailText.fontSize, lineHeight: detailText.lineHeight }]}
                numberOfLines={1}
                ellipsizeMode="tail"
              >
                {task.title}
              </Text>
            </View>
          ))}
      </View>
    </BaseWidgetFrame>
  );
}

const styles = StyleSheet.create({
  content: {
    flex: 1,
    width: "100%",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "flex-start",
    overflow: "hidden",
  },
  heroRegion: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },
  heroCard: {
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.07)",
    borderRadius: radius.md,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    maxWidth: "100%",
  },
  heroTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    fontWeight: "700",
    textAlign: "center",
  },
  supportRegion: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 0,
  },
  supportText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  detailRegion: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 0,
  },
  detailRow: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },
  groupBlock: {
    width: "100%",
    alignItems: "center",
    justifyContent: "center",
    minHeight: 0,
  },
  groupTitle: {
    ...typography.caption,
    color: colors.textSecondary,
    textTransform: "uppercase",
    letterSpacing: 0.4,
    textAlign: "center",
  },
  detailTitle: {
    ...typography.small,
    color: colors.textPrimary,
    textAlign: "center",
    maxWidth: "100%",
  },
  detailMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.8,
    textAlign: "center",
  },
});
