import type { InspectorDefinition } from "../../features/admin/inspector/inspector.types";

export interface RssNewsConfig {
  feedUrl?: string;
  maxItems?: number;
  showImages?: boolean;
  showPublishedAt?: boolean;
  layout?: "headline-list" | "ticker";
  title?: string;
}

export interface RssNewsInspectorContext {
  onChange: (patch: Partial<RssNewsConfig>) => void;
}

const LAYOUT_LABELS: Record<NonNullable<RssNewsConfig["layout"]>, string> = {
  "headline-list": "Headline list",
  ticker: "Ticker",
};

export function getInspectorDefinition(
  config: RssNewsConfig,
  context: RssNewsInspectorContext,
): InspectorDefinition {
  const feedUrl = config.feedUrl ?? "";
  const title = config.title ?? "Latest News";
  const layout = config.layout ?? "headline-list";
  const maxItems = config.maxItems ?? 5;
  const showImages = config.showImages ?? true;
  const showPublishedAt = config.showPublishedAt ?? true;

  return {
    sections: [
      {
        id: "source",
        title: "Source",
        fields: [
          {
            id: "feedUrl",
            label: "RSS feed URL",
            kind: "text",
            value: feedUrl,
            displayValue: feedUrl || "Not set",
            editable: true,
            helperText: "Paste an RSS or Atom feed URL",
            onChange: (value: string) => context.onChange({ feedUrl: value }),
          },
          {
            id: "title",
            label: "Widget title",
            kind: "text",
            value: title,
            displayValue: title || "Latest News",
            editable: true,
            onChange: (value: string) => context.onChange({ title: value }),
          },
        ],
      },
      {
        id: "display",
        title: "Display",
        fields: [
          {
            id: "layout",
            label: "Layout",
            kind: "segmented",
            value: layout,
            displayValue: LAYOUT_LABELS[layout] ?? "Headline list",
            editable: true,
            options: [
              { label: "List", value: "headline-list" },
              { label: "Ticker", value: "ticker" },
            ],
            onChange: (value: "headline-list" | "ticker") => context.onChange({ layout: value }),
          },
          {
            id: "maxItems",
            label: "Max items",
            kind: "segmented",
            value: maxItems,
            displayValue: String(maxItems),
            editable: true,
            options: [
              { label: "3", value: 3 },
              { label: "5", value: 5 },
              { label: "8", value: 8 },
              { label: "10", value: 10 },
            ],
            onChange: (value: number) => context.onChange({ maxItems: value }),
          },
          {
            id: "showImages",
            label: "Show images",
            kind: "boolean",
            value: showImages,
            displayValue: showImages ? "Yes" : "No",
            editable: true,
            onChange: (value: boolean) => context.onChange({ showImages: value }),
          },
          {
            id: "showPublishedAt",
            label: "Show published date",
            kind: "boolean",
            value: showPublishedAt,
            displayValue: showPublishedAt ? "Yes" : "No",
            editable: true,
            onChange: (value: boolean) => context.onChange({ showPublishedAt: value }),
          },
        ],
      },
    ],
  };
}
