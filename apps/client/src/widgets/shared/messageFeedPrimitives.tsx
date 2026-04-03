import React from "react";
import { StyleSheet, View } from "react-native";
import { Text } from "../../shared/ui/components";
import { colors, radius, spacing, typography } from "../../shared/ui/theme";

export interface LeadItemProps {
  title: string;
  sender: string;
  timeLabel: string;
  preview?: string;
  titleFontSize: number;
  titleLineHeight: number;
  bodyFontSize: number;
  bodyLineHeight: number;
  metaFontSize: number;
  metaLineHeight: number;
  showPreview: boolean;
}

export function LeadItem({
  title,
  sender,
  timeLabel,
  preview,
  titleFontSize,
  titleLineHeight,
  bodyFontSize,
  bodyLineHeight,
  metaFontSize,
  metaLineHeight,
  showPreview,
}: LeadItemProps) {
  return (
    <View style={styles.leadCard}>
      <Text style={[styles.leadTitle, { fontSize: titleFontSize, lineHeight: titleLineHeight }]} numberOfLines={2}>
        {title}
      </Text>
      <View style={styles.leadMetaRow}>
        <Text style={[styles.leadMeta, { fontSize: metaFontSize, lineHeight: metaLineHeight }]} numberOfLines={1}>
          {sender}
        </Text>
        <Text style={[styles.leadMeta, { fontSize: metaFontSize, lineHeight: metaLineHeight }]} numberOfLines={1}>
          {timeLabel}
        </Text>
      </View>
      {showPreview && preview ? (
        <Text style={[styles.leadPreview, { fontSize: bodyFontSize, lineHeight: bodyLineHeight }]} numberOfLines={2}>
          {preview}
        </Text>
      ) : null}
    </View>
  );
}

export interface MessageRowProps {
  title: string;
  sender: string;
  timeLabel: string;
  preview?: string;
  isUnread: boolean;
  showPreview: boolean;
  bodyFontSize: number;
  bodyLineHeight: number;
  metaFontSize: number;
  metaLineHeight: number;
}

export function MessageRow({
  title,
  sender,
  timeLabel,
  preview,
  isUnread,
  showPreview,
  bodyFontSize,
  bodyLineHeight,
  metaFontSize,
  metaLineHeight,
}: MessageRowProps) {
  return (
    <View style={styles.rowWrap}>
      <View style={styles.rowTopLine}>
        <Text
          style={[styles.rowTitle, isUnread ? styles.rowTitleUnread : null, { fontSize: bodyFontSize, lineHeight: bodyLineHeight }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        <Text style={[styles.rowMeta, { fontSize: metaFontSize, lineHeight: metaLineHeight }]} numberOfLines={1}>
          {timeLabel}
        </Text>
      </View>
      <Text style={[styles.rowMeta, { fontSize: metaFontSize, lineHeight: metaLineHeight }]} numberOfLines={1}>
        {sender}
      </Text>
      {showPreview && preview ? (
        <Text style={[styles.rowPreview, { fontSize: metaFontSize, lineHeight: metaLineHeight }]} numberOfLines={1}>
          {preview}
        </Text>
      ) : null}
    </View>
  );
}

export interface MetadataBarProps {
  leftText: string;
  rightText: string;
  fontSize: number;
  lineHeight: number;
}

export function MetadataBar({ leftText, rightText, fontSize, lineHeight }: MetadataBarProps) {
  return (
    <View style={styles.metaBar}>
      <Text style={[styles.metaBarText, { fontSize, lineHeight }]} numberOfLines={1}>{leftText}</Text>
      <Text style={[styles.metaBarText, { fontSize, lineHeight }]} numberOfLines={1}>{rightText}</Text>
    </View>
  );
}

export interface SafeFitListProps<TItem> {
  items: TItem[];
  availableHeight: number;
  minRowHeight: number;
  rowGap: number;
  maxItems: number;
  renderItem: (item: TItem, index: number) => React.ReactNode;
}

export function computeSafeFitRows(input: {
  availableHeight: number;
  minRowHeight: number;
  rowGap: number;
  maxItems: number;
}): number {
  const available = Math.max(0, input.availableHeight);
  const rowHeight = Math.max(1, input.minRowHeight);
  const gap = Math.max(0, input.rowGap);
  const cap = Math.max(0, input.maxItems);
  if (cap === 0) return 0;

  const fit = Math.floor((available + gap) / (rowHeight + gap));
  return Math.max(0, Math.min(cap, fit));
}

export function SafeFitList<TItem>({
  items,
  availableHeight,
  minRowHeight,
  rowGap,
  maxItems,
  renderItem,
}: SafeFitListProps<TItem>) {
  const visibleCount = Math.min(
    items.length,
    computeSafeFitRows({
      availableHeight,
      minRowHeight,
      rowGap,
      maxItems,
    }),
  );

  return (
    <View style={[styles.listWrap, { gap: rowGap }]}> 
      {items.slice(0, visibleCount).map((item, index) => (
        <React.Fragment key={index}>{renderItem(item, index)}</React.Fragment>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  leadCard: {
    width: "100%",
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.07)",
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.xs,
  },
  leadTitle: {
    ...typography.titleSm,
    color: colors.textPrimary,
    fontWeight: "700",
  },
  leadMetaRow: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  leadMeta: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  leadPreview: {
    ...typography.small,
    color: colors.textSecondary,
    opacity: 0.9,
  },
  metaBar: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  metaBarText: {
    ...typography.caption,
    color: colors.textSecondary,
    flexShrink: 1,
  },
  listWrap: {
    width: "100%",
  },
  rowWrap: {
    width: "100%",
    borderRadius: radius.sm,
    backgroundColor: "rgba(255,255,255,0.03)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
  },
  rowTopLine: {
    width: "100%",
    flexDirection: "row",
    justifyContent: "space-between",
    gap: spacing.xs,
  },
  rowTitle: {
    ...typography.small,
    color: colors.textPrimary,
    flexShrink: 1,
    fontWeight: "500",
  },
  rowTitleUnread: {
    fontWeight: "700",
  },
  rowMeta: {
    ...typography.caption,
    color: colors.textSecondary,
  },
  rowPreview: {
    ...typography.caption,
    color: colors.textSecondary,
    opacity: 0.9,
  },
});
