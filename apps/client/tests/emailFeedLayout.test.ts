import { describe, expect, it } from "vitest";
import { computeSafeFitRows, resolveEmailFeedLayout } from "../src/widgets/emailFeed/layout";

describe("email feed safe-fit layout", () => {
  it("reduces rows to avoid overlap when height is constrained", () => {
    const rows = computeSafeFitRows({
      availableHeight: 90,
      minRowHeight: 32,
      rowGap: 4,
      maxItems: 8,
    });

    expect(rows).toBe(2);
  });

  it("drops preview before dropping rows when preview costs too much space", () => {
    const result = resolveEmailFeedLayout({
      sizeTier: "fullscreen",
      availableHeight: 100,
      maxItems: 6,
      remainingItems: 6,
      rowGap: 4,
      baseRowHeight: 28,
      previewRowHeight: 44,
      requestShowPreview: true,
    });

    expect(result.showPreview).toBe(false);
    expect(result.detailRows).toBe(3);
  });

  it("enforces compact tier cap (lead + at most one detail row)", () => {
    const result = resolveEmailFeedLayout({
      sizeTier: "compact",
      availableHeight: 200,
      maxItems: 10,
      remainingItems: 8,
      rowGap: 4,
      baseRowHeight: 24,
      previewRowHeight: 38,
      requestShowPreview: true,
    });

    expect(result.detailRows).toBeLessThanOrEqual(1);
    expect(result.showPreview).toBe(false);
  });
});
