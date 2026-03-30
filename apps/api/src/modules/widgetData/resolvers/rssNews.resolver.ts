import type {
  RssNewsWidgetData,
  WidgetConfigByKey,
  WidgetDataEnvelope,
} from "@ambient/shared-contracts";
import {
  fetchRssFeedData,
  type RssProviderResult,
} from "../providers/rss.provider";

function toTrimmedString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

export function toRssNewsConfig(config: unknown): WidgetConfigByKey["rssNews"] {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  const maxItems =
    typeof raw.maxItems === "number" && Number.isFinite(raw.maxItems)
      ? Math.min(20, Math.max(1, Math.round(raw.maxItems)))
      : 5;

  const layout = raw.layout === "ticker" || raw.layout === "headline-list"
    ? raw.layout
    : "headline-list";

  return {
    feedUrl: toTrimmedString(raw.feedUrl),
    maxItems,
    showImages: typeof raw.showImages === "boolean" ? raw.showImages : true,
    showPublishedAt: typeof raw.showPublishedAt === "boolean" ? raw.showPublishedAt : true,
    layout,
    title: toTrimmedString(raw.title) || "Latest News",
  };
}

function toMaybeIsoDate(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return undefined;
  }

  return parsed.toISOString();
}

function toSafeHttpUrl(value: string | undefined): string | undefined {
  if (!value) {
    return undefined;
  }

  try {
    const parsed = new URL(value);
    if (parsed.protocol === "http:" || parsed.protocol === "https:") {
      return parsed.toString();
    }
    return undefined;
  } catch {
    return undefined;
  }
}

function toStableDataShape(input: {
  config: WidgetConfigByKey["rssNews"];
  providerResult: RssProviderResult;
}): RssNewsWidgetData {
  const maxItems = input.config.maxItems ?? 5;
  const fallbackLink = toSafeHttpUrl(input.providerResult.channel.link) ?? input.providerResult.feedUrl;

  const items = input.providerResult.items
    .map((item, index) => {
      const title = toTrimmedString(item.title) || "Untitled headline";
      const link = toSafeHttpUrl(item.link) ?? fallbackLink;
      if (!link) {
        return null;
      }

      const id = toTrimmedString(item.id) || link || `${index}-${title}`;
      const summary = toTrimmedString(item.summary) || undefined;
      const publishedAt = toMaybeIsoDate(item.publishedAt);
      const imageUrl = toSafeHttpUrl(item.imageUrl);

      return {
        id,
        title,
        link,
        summary,
        publishedAt,
        imageUrl,
      };
    })
    .filter((item): item is NonNullable<typeof item> => item !== null)
    .slice(0, maxItems);

  return {
    title: toTrimmedString(input.config.title) || "Latest News",
    siteTitle: toTrimmedString(input.providerResult.channel.title) || undefined,
    feedUrl: input.providerResult.feedUrl,
    items,
  };
}

function buildEmptyData(config: WidgetConfigByKey["rssNews"]): RssNewsWidgetData {
  return {
    title: toTrimmedString(config.title) || "Latest News",
    siteTitle: undefined,
    feedUrl: toTrimmedString(config.feedUrl),
    items: [],
  };
}

export async function resolveRssNewsWidgetData(input: {
  widgetInstanceId: string;
  widgetConfig: unknown;
  fetchFeedData?: (input: {
    feedUrl: string;
    timeoutMs?: number;
  }) => Promise<RssProviderResult>;
}): Promise<WidgetDataEnvelope<RssNewsWidgetData, "rssNews">> {
  const config = toRssNewsConfig(input.widgetConfig);
  const fetchFeedData = input.fetchFeedData ?? fetchRssFeedData;

  if (!config.feedUrl) {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "rssNews",
      state: "empty",
      data: buildEmptyData(config),
      meta: {
        source: "rss",
        errorCode: "RSS_FEED_NOT_CONFIGURED",
        message: "RSS feed URL is required.",
      },
    };
  }

  try {
    const providerResult = await fetchFeedData({ feedUrl: config.feedUrl, timeoutMs: 8_000 });
    const data = toStableDataShape({ config, providerResult });

    if (data.items.length === 0) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "rssNews",
        state: "empty",
        data,
        meta: {
          source: "rss",
          message: "Feed has no items.",
        },
      };
    }

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "rssNews",
      state: "ready",
      data,
      meta: {
        fetchedAt: providerResult.fetchedAtIso,
        source: "rss",
      },
    };
  } catch {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "rssNews",
      state: "stale",
      data: buildEmptyData(config),
      meta: {
        source: "rss",
        errorCode: "RSS_PROVIDER_UNAVAILABLE",
        message: "RSS feed could not be fetched.",
      },
    };
  }
}
