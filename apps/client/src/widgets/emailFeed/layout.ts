import type { WidgetRenderSizeTier } from "@ambient/shared-contracts";

export interface EmailFeedLayoutInput {
  sizeTier: WidgetRenderSizeTier;
  availableHeight: number;
  maxItems: number;
  remainingItems: number;
  rowGap: number;
  baseRowHeight: number;
  previewRowHeight: number;
  requestShowPreview: boolean;
}

export interface EmailFeedLayoutResult {
  detailRows: number;
  showPreview: boolean;
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

function tierDetailCap(sizeTier: WidgetRenderSizeTier): number {
  if (sizeTier === "compact") return 1;
  if (sizeTier === "regular") return 3;
  if (sizeTier === "large") return 5;
  return 10;
}

function tierAllowsPreview(sizeTier: WidgetRenderSizeTier): boolean {
  if (sizeTier === "compact") return false;
  if (sizeTier === "regular") return false;
  return true;
}

export function resolveEmailFeedLayout(input: EmailFeedLayoutInput): EmailFeedLayoutResult {
  const targetRows = Math.min(
    input.remainingItems,
    Math.max(0, Math.min(input.maxItems, tierDetailCap(input.sizeTier))),
  );

  if (targetRows <= 0) {
    return { detailRows: 0, showPreview: false };
  }

  const previewRequested = input.requestShowPreview && tierAllowsPreview(input.sizeTier);

  const rowsWithPreview = previewRequested
    ? computeSafeFitRows({
      availableHeight: input.availableHeight,
      minRowHeight: input.previewRowHeight,
      rowGap: input.rowGap,
      maxItems: targetRows,
    })
    : 0;

  const rowsWithoutPreview = computeSafeFitRows({
    availableHeight: input.availableHeight,
    minRowHeight: input.baseRowHeight,
    rowGap: input.rowGap,
    maxItems: targetRows,
  });

  if (previewRequested && rowsWithoutPreview > rowsWithPreview) {
    return {
      detailRows: rowsWithoutPreview,
      showPreview: false,
    };
  }

  return {
    detailRows: previewRequested ? rowsWithPreview : rowsWithoutPreview,
    showPreview: previewRequested,
  };
}
