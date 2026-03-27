import React from "react";
import { StyleSheet, View } from "react-native";
import type { WidgetRendererProps } from "@ambient/shared-contracts";
import { AppIcon, Text } from "../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../shared/ui/theme";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";
import { computeRenderTokens, deriveWidgetVisualScale, scaleBy } from "../shared/widgetRenderContext";

// Maximum events shown in non-fullscreen tiers.
const MAX_EVENTS_COMPACT = 1;
const MAX_EVENTS_REGULAR = 3;
const MAX_EVENTS_LARGE = 4;
// Maximum remaining events shown in the fullscreen detail region.
const MAX_DETAIL_EVENTS_FULLSCREEN = 3;

export function CalendarRenderer({ state, data, renderContext }: WidgetRendererProps<"calendar">) {
  const visualScale = deriveWidgetVisualScale(renderContext);
  const tokens = computeRenderTokens(renderContext ?? {
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
  });
  const sizeTier = visualScale.sizeTier;
  const isFullscreen = sizeTier === "fullscreen";
  const widgetHeight = renderContext?.widgetHeight ?? 0;

  const hasData = Boolean(data && data.events.length > 0);
  const events = data?.events ?? [];
  const firstEvent = events[0] ?? null;

  if (isFullscreen) {
    // ─── Fullscreen: three-region composition ───────────────────────────────
    // Hero:    first upcoming event title (highlighted)
    // Support: event time + location
    // Detail:  remaining events (compact rows, ≤ MAX_DETAIL_EVENTS_FULLSCREEN)

    const remainingEvents = events.slice(1, 1 + MAX_DETAIL_EVENTS_FULLSCREEN);
    const extraCount = Math.max(0, events.length - 1 - remainingEvents.length);

    // Hero font: proportional to widget height. Smaller than clock/weather hero
    // because event titles can be long. adjustsFontSizeToFit handles overflow.
    const heroTitleSize = widgetHeight > 0
      ? Math.round(widgetHeight * 0.085)
      : tokens.titleFontSize;

    return (
      <BaseWidgetFrame
        title="Calendar"
        icon="calendar"
        state={state}
        hasData={hasData}
        emptyMessage="No events scheduled."
        errorMessage="Unable to load calendar data."
        contentStyle={styles.fullscreenContent}
        renderContext={renderContext}
      >
        {firstEvent ? (
          <>
            {/* Hero region: first upcoming event */}
            <View style={styles.heroEventCard}>
              <Text
                style={[styles.heroEventTitle, { fontSize: heroTitleSize }]}
                adjustsFontSizeToFit
                numberOfLines={2}
                minimumFontScale={0.55}
              >
                {firstEvent.title}
              </Text>
            </View>

            {/* Support region: first event metadata */}
            <View style={[styles.supportRegion, { marginTop: tokens.heroSupportGap }]}>
              <View style={styles.metaRow}>
                <AppIcon name="clock" size={tokens.iconSize} color="textSecondary" />
                <Text
                  style={[styles.supportText, { fontSize: tokens.bodyFontSize }]}
                  numberOfLines={1}
                >
                  {formatEventTime(firstEvent.startIso, firstEvent.allDay)}
                </Text>
              </View>
              {firstEvent.location ? (
                <Text
                  style={[styles.supportLocation, { fontSize: tokens.metaFontSize, marginTop: tokens.itemGap }]}
                  numberOfLines={1}
                >
                  {firstEvent.location}
                </Text>
              ) : null}
            </View>

            {/* Detail region: remaining events */}
            {remainingEvents.length > 0 ? (
              <View style={[styles.detailRegion, { marginTop: tokens.supportDetailGap }]}>
                {remainingEvents.map((event) => (
                  <View
                    key={event.id}
                    style={[styles.detailEventRow, { gap: tokens.itemGap, marginTop: tokens.itemGap }]}
                  >
                    <Text
                      style={[styles.detailEventTitle, { fontSize: tokens.metaFontSize }]}
                      numberOfLines={1}
                      adjustsFontSizeToFit
                      minimumFontScale={0.75}
                    >
                      {event.title}
                    </Text>
                    <Text
                      style={[styles.detailEventTime, { fontSize: tokens.metaFontSize }]}
                      numberOfLines={1}
                    >
                      {formatEventTime(event.startIso, event.allDay)}
                    </Text>
                  </View>
                ))}
                {extraCount > 0 ? (
                  <Text style={[styles.moreLabel, { fontSize: tokens.metaFontSize, marginTop: tokens.itemGap }]}>
                    +{extraCount} more events
                  </Text>
                ) : null}
              </View>
            ) : null}
          </>
        ) : null}
      </BaseWidgetFrame>
    );
  }

  // ─── Non-fullscreen: compact event list ────────────────────────────────────
  const maxVisible = sizeTier === "compact"
    ? MAX_EVENTS_COMPACT
    : sizeTier === "large"
    ? MAX_EVENTS_LARGE
    : MAX_EVENTS_REGULAR;

  const visibleEvents = events.slice(0, maxVisible);
  const remainingCount = Math.max(0, events.length - visibleEvents.length);

  const eventTitleFontSize = scaleBy(17, visualScale.typographyScale, 12);
  const eventMetaFontSize = scaleBy(14, visualScale.typographyScale, 11);
  const moreLabelFontSize = scaleBy(13, visualScale.typographyScale, 11);

  return (
    <BaseWidgetFrame
      title="Calendar"
      icon="calendar"
      state={state}
      hasData={hasData}
      emptyMessage="No events scheduled."
      errorMessage="Unable to load data."
      contentStyle={styles.content}
      renderContext={renderContext}
    >
      <View style={[styles.eventsList, { gap: scaleBy(spacing.sm, visualScale.spacingScale, 4) }]}>
        {visibleEvents.map((event) => (
          <View key={event.id} style={[styles.eventRow, {
            paddingHorizontal: scaleBy(spacing.lg, visualScale.spacingScale, 8),
            paddingVertical: scaleBy(spacing.md, visualScale.spacingScale, 6),
          }]}>
            <Text
              style={[styles.eventTitle, { fontSize: eventTitleFontSize }]}
              numberOfLines={1}
              adjustsFontSizeToFit
              minimumFontScale={0.7}
            >
              {event.title}
            </Text>
            <View style={[styles.metaRow, { marginTop: scaleBy(spacing.xs, visualScale.spacingScale, 2) }]}>
              <AppIcon name="clock" size={visualScale.iconScale > 1.3 ? "md" : "sm"} color="textSecondary" />
              <Text style={[styles.eventMeta, { fontSize: eventMetaFontSize }]} numberOfLines={1}>
                {formatEventTime(event.startIso, event.allDay)}
              </Text>
            </View>
            {event.location && sizeTier !== "compact" ? (
              <Text style={[styles.eventMeta, { fontSize: eventMetaFontSize }]} numberOfLines={1}>
                {event.location}
              </Text>
            ) : null}
          </View>
        ))}
        {remainingCount > 0 ? (
          <Text style={[styles.moreLabel, { fontSize: moreLabelFontSize }]}>+{remainingCount} more events</Text>
        ) : null}
      </View>
    </BaseWidgetFrame>
  );
}

const styles = StyleSheet.create({
  // ── Fullscreen layout ──────────────────────────────────────────────────────
  fullscreenContent: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  heroEventCard: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.14)",
    backgroundColor: "rgba(255, 255, 255, 0.06)",
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    alignItems: "center",
    maxWidth: "100%",
  },
  heroEventTitle: {
    fontWeight: "700",
    color: colors.textPrimary,
    textAlign: "center",
    maxWidth: "100%",
  },
  supportRegion: {
    alignItems: "center",
    maxWidth: "100%",
  },
  supportText: {
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
  supportLocation: {
    color: colors.textSecondary,
    textAlign: "center",
  },
  detailRegion: {
    alignItems: "center",
    maxWidth: "100%",
  },
  detailEventRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    flexWrap: "nowrap",
    maxWidth: "100%",
  },
  detailEventTitle: {
    color: colors.textPrimary,
    textAlign: "center",
    flexShrink: 1,
  },
  detailEventTime: {
    color: colors.textSecondary,
    textAlign: "center",
    flexShrink: 0,
    marginLeft: spacing.xs,
  },

  // ── Non-fullscreen list layout ─────────────────────────────────────────────
  content: {
    flex: 1,
    justifyContent: "center",
  },
  eventsList: {
    gap: spacing.sm,
  },
  eventRow: {
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255, 255, 255, 0.08)",
    backgroundColor: "rgba(255, 255, 255, 0.03)",
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    alignItems: "center",
  },
  metaRow: {
    marginTop: spacing.xs,
    flexDirection: "row",
    alignItems: "center",
    gap: spacing.xs,
  },
  eventTitle: {
    ...typography.titleMd,
    color: colors.textPrimary,
    textAlign: "center",
    maxWidth: "100%",
  },
  eventMeta: {
    ...typography.titleSm,
    color: colors.textSecondary,
    textAlign: "center",
    maxWidth: "100%",
  },
  moreLabel: {
    marginTop: spacing.xs,
    ...typography.body,
    color: colors.textSecondary,
    textAlign: "center",
  },
});

function formatEventTime(iso: string, allDay: boolean): string {
  if (allDay) {
    return "All day";
  }

  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) {
    return iso;
  }

  return new Intl.DateTimeFormat(undefined, {
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}
