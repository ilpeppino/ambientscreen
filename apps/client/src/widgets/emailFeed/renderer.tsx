import React from "react";
import { StyleSheet, View } from "react-native";
import type { WidgetRenderContext, WidgetRendererProps } from "@ambient/shared-contracts";
import { BaseWidgetFrame } from "../shared/BaseWidgetFrame";
import {
  computeRegionHeights,
  computeRegionInsets,
  computeRenderTokens,
  fitTextToRegion,
  scaleBy,
} from "../shared/widgetRenderContext";
import { LeadItem, MessageRow, MetadataBar, SafeFitList } from "../shared/messageFeedPrimitives";
import { resolveEmailFeedLayout } from "./layout";

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

function formatMessageTime(timestamp: string): string {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) {
    return "";
  }

  return new Intl.DateTimeFormat(undefined, {
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function EmailFeedRenderer({ state, data, config, renderContext }: WidgetRendererProps<"emailFeed">) {
  const safeContext = renderContext ?? SAFE_CONTEXT;
  const tokens = computeRenderTokens(safeContext);
  const regions = computeRegionHeights(safeContext);
  const regionInsets = computeRegionInsets(regions, {
    supportTop: tokens.heroSupportGap,
    detailTop: tokens.supportDetailGap,
  });

  const messages = data?.messages ?? [];
  const lead = messages[0] ?? null;
  const detailMessages = messages.slice(1);
  const hasData = messages.length > 0;

  const configuredMaxItems = typeof config.maxItems === "number" && Number.isFinite(config.maxItems)
    ? Math.max(1, Math.round(config.maxItems))
    : 8;
  const detailMaxItems = Math.max(0, configuredMaxItems - 1);

  const metaText = fitTextToRegion({
    targetFontSize: tokens.metaFontSize,
    regionHeight: Math.max(1, Math.round(regions.support * 0.45)),
    minFontSize: 9,
    lineHeightRatio: 1.12,
  });

  const heroTitleText = fitTextToRegion({
    targetFontSize: safeContext.sizeTier === "fullscreen" ? Math.round(safeContext.widgetHeight * 0.075) : tokens.titleFontSize,
    regionHeight: Math.max(1, Math.round(regions.hero * 0.45)),
    lines: safeContext.sizeTier === "compact" ? 1 : 2,
    minFontSize: 12,
    lineHeightRatio: 1.1,
  });

  const heroBodyText = fitTextToRegion({
    targetFontSize: tokens.bodyFontSize,
    regionHeight: Math.max(1, Math.round(regions.hero * 0.22)),
    lines: 1,
    minFontSize: 9,
    lineHeightRatio: 1.12,
  });

  const detailBodyText = fitTextToRegion({
    targetFontSize: tokens.bodyFontSize,
    regionHeight: Math.max(1, Math.round(regions.detail * 0.28)),
    minFontSize: 9,
    lineHeightRatio: 1.12,
  });

  const detailMetaText = fitTextToRegion({
    targetFontSize: tokens.metaFontSize,
    regionHeight: Math.max(1, Math.round(regions.detail * 0.18)),
    minFontSize: 8,
    lineHeightRatio: 1.12,
  });

  const rowGap = scaleBy(tokens.itemGap, 1, 2);
  const baseRowHeight = detailBodyText.lineHeight + detailMetaText.lineHeight + 8;
  const previewRowHeight = baseRowHeight + detailMetaText.lineHeight + 2;

  const detailAvailableHeight = Math.max(1, regions.detail - regionInsets.detailTop);
  const layout = resolveEmailFeedLayout({
    sizeTier: safeContext.sizeTier,
    availableHeight: detailAvailableHeight,
    maxItems: detailMaxItems,
    remainingItems: detailMessages.length,
    rowGap,
    baseRowHeight,
    previewRowHeight,
    requestShowPreview: config.showPreview ?? false,
  });

  return (
    <BaseWidgetFrame
      title="Email Feed"
      icon="mail"
      state={state}
      hasData={hasData}
      emptyMessage="No messages found."
      errorMessage="Unable to load email feed."
      renderContext={safeContext}
      contentStyle={styles.content}
    >
      {lead ? (
        <>
          <View style={[styles.heroRegion, { flexBasis: regions.hero, minHeight: regions.hero }]}> 
            <LeadItem
              title={lead.title}
              sender={lead.sender}
              timeLabel={formatMessageTime(lead.timestamp)}
              preview={lead.preview}
              showPreview={safeContext.sizeTier !== "compact" && (config.showPreview ?? false)}
              titleFontSize={heroTitleText.fontSize}
              titleLineHeight={heroTitleText.lineHeight}
              bodyFontSize={heroBodyText.fontSize}
              bodyLineHeight={heroBodyText.lineHeight}
              metaFontSize={metaText.fontSize}
              metaLineHeight={metaText.lineHeight}
            />
          </View>

          <View style={[styles.supportRegion, {
            flexBasis: regions.support,
            minHeight: regions.support,
            paddingTop: regionInsets.supportTop,
          }]}
          >
            <MetadataBar
              leftText={data?.mailboxLabel ?? "Inbox"}
              rightText={`${data?.unreadCount ?? 0} unread`}
              fontSize={metaText.fontSize}
              lineHeight={metaText.lineHeight}
            />
          </View>

          <View style={[styles.detailRegion, {
            flexBasis: regions.detail,
            minHeight: regions.detail,
            paddingTop: regionInsets.detailTop,
          }]}
          >
            <SafeFitList
              items={detailMessages.slice(0, layout.detailRows)}
              availableHeight={detailAvailableHeight}
              minRowHeight={layout.showPreview ? previewRowHeight : baseRowHeight}
              rowGap={rowGap}
              maxItems={layout.detailRows}
              renderItem={(message) => (
                <MessageRow
                  key={message.id}
                  title={message.title}
                  sender={message.sender}
                  timeLabel={formatMessageTime(message.timestamp)}
                  preview={message.preview}
                  isUnread={message.isUnread}
                  showPreview={layout.showPreview}
                  bodyFontSize={detailBodyText.fontSize}
                  bodyLineHeight={detailBodyText.lineHeight}
                  metaFontSize={detailMetaText.fontSize}
                  metaLineHeight={detailMetaText.lineHeight}
                />
              )}
            />
          </View>
        </>
      ) : null}
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
  supportRegion: {
    width: "100%",
    alignItems: "center",
    justifyContent: "flex-start",
    minHeight: 0,
  },
  detailRegion: {
    width: "100%",
    minHeight: 0,
    alignItems: "center",
    justifyContent: "flex-start",
  },
});
