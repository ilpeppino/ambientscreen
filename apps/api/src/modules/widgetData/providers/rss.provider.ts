export type RssProviderErrorCode =
  | "RSS_INVALID_URL"
  | "RSS_TIMEOUT"
  | "RSS_REQUEST_FAILED"
  | "RSS_PARSE_FAILED";

export class RssProviderError extends Error {
  code: RssProviderErrorCode;

  constructor(code: RssProviderErrorCode, message: string) {
    super(message);
    this.code = code;
    this.name = "RssProviderError";
  }
}

export interface RssProviderItem {
  id?: string;
  title?: string;
  link?: string;
  summary?: string;
  publishedAt?: string;
  imageUrl?: string;
}

export interface RssProviderResult {
  format: "rss" | "atom" | "unknown";
  fetchedAtIso: string;
  feedUrl: string;
  channel: {
    title?: string;
    description?: string;
    link?: string;
  };
  items: RssProviderItem[];
}

const DEFAULT_TIMEOUT_MS = 8_000;
const MAX_XML_SIZE_CHARS = 1_500_000;

function decodeXmlEntities(value: string): string {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/gi, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/gi, "'")
    .trim();
}

function stripHtmlTags(value: string): string {
  return value.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function extractTagValue(xml: string, tagNames: string[]): string | undefined {
  for (const tagName of tagNames) {
    const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "i");
    const match = xml.match(regex);
    if (!match?.[1]) {
      continue;
    }

    const decoded = decodeXmlEntities(match[1]);
    if (decoded.length > 0) {
      return decoded;
    }
  }

  return undefined;
}

function extractBlockValues(xml: string, tagName: string): string[] {
  const escapedTag = tagName.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`<${escapedTag}\\b[^>]*>([\\s\\S]*?)<\\/${escapedTag}>`, "gi");
  const blocks: string[] = [];

  for (const match of xml.matchAll(regex)) {
    if (typeof match[1] === "string") {
      blocks.push(match[1]);
    }
  }

  return blocks;
}

function extractAtomLink(entryXml: string): string | undefined {
  const hrefMatch = entryXml.match(/<link\b[^>]*\bhref=["']([^"']+)["'][^>]*>/i);
  if (hrefMatch?.[1]) {
    return decodeXmlEntities(hrefMatch[1]);
  }

  return extractTagValue(entryXml, ["link"]);
}

function extractImageUrl(itemXml: string): string | undefined {
  const mediaContentMatch = itemXml.match(/<media:content\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
  if (mediaContentMatch?.[1]) {
    return decodeXmlEntities(mediaContentMatch[1]);
  }

  const mediaThumbnailMatch = itemXml.match(/<media:thumbnail\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
  if (mediaThumbnailMatch?.[1]) {
    return decodeXmlEntities(mediaThumbnailMatch[1]);
  }

  const enclosureMatch = itemXml.match(/<enclosure\b[^>]*\burl=["']([^"']+)["'][^>]*>/i);
  if (enclosureMatch?.[1]) {
    return decodeXmlEntities(enclosureMatch[1]);
  }

  return extractTagValue(itemXml, ["image", "thumbnail"]);
}

function parseRssItems(xml: string): RssProviderItem[] {
  const itemBlocks = extractBlockValues(xml, "item");
  return itemBlocks.map((itemXml) => ({
    id: extractTagValue(itemXml, ["guid"]),
    title: extractTagValue(itemXml, ["title"]),
    link: extractTagValue(itemXml, ["link"]),
    summary: stripHtmlTags(extractTagValue(itemXml, ["description", "content:encoded", "summary"]) ?? ""),
    publishedAt: extractTagValue(itemXml, ["pubDate", "dc:date", "updated"]),
    imageUrl: extractImageUrl(itemXml),
  }));
}

function parseAtomItems(xml: string): RssProviderItem[] {
  const entryBlocks = extractBlockValues(xml, "entry");

  return entryBlocks.map((entryXml) => ({
    id: extractTagValue(entryXml, ["id"]),
    title: extractTagValue(entryXml, ["title"]),
    link: extractAtomLink(entryXml),
    summary: stripHtmlTags(extractTagValue(entryXml, ["summary", "content"]) ?? ""),
    publishedAt: extractTagValue(entryXml, ["published", "updated"]),
    imageUrl: extractImageUrl(entryXml),
  }));
}

function parseRssOrAtom(xml: string, feedUrl: string): RssProviderResult {
  const hasRss = /<rss\b/i.test(xml) || /<channel\b/i.test(xml);
  const hasAtom = /<feed\b/i.test(xml) || /<entry\b/i.test(xml);

  const channelTitle = extractTagValue(xml, ["channel", "feed"]);
  const commonTitle = extractTagValue(xml, ["title"]);

  if (!hasRss && !hasAtom) {
    throw new RssProviderError("RSS_PARSE_FAILED", "Invalid RSS/Atom XML payload.");
  }

  if (hasRss) {
    const channelBlocks = extractBlockValues(xml, "channel");
    const channelXml = channelBlocks[0] ?? xml;

    return {
      format: "rss",
      fetchedAtIso: new Date().toISOString(),
      feedUrl,
      channel: {
        title: extractTagValue(channelXml, ["title"]) ?? channelTitle ?? commonTitle,
        description: extractTagValue(channelXml, ["description"]),
        link: extractTagValue(channelXml, ["link"]),
      },
      items: parseRssItems(channelXml),
    };
  }

  return {
    format: "atom",
    fetchedAtIso: new Date().toISOString(),
    feedUrl,
    channel: {
      title: commonTitle,
      description: extractTagValue(xml, ["subtitle"]),
      link: extractTagValue(xml, ["link"]),
    },
    items: parseAtomItems(xml),
  };
}

function isIpv4Literal(hostname: string): boolean {
  const parts = hostname.split(".");
  if (parts.length !== 4) {
    return false;
  }

  return parts.every((segment) => /^\d+$/.test(segment) && Number(segment) >= 0 && Number(segment) <= 255);
}

function isPrivateIpv4(hostname: string): boolean {
  if (!isIpv4Literal(hostname)) {
    return false;
  }

  const [a, b] = hostname.split(".").map((segment) => Number(segment));

  return (
    a === 10
    || a === 127
    || a === 0
    || (a === 169 && b === 254)
    || (a === 172 && b >= 16 && b <= 31)
    || (a === 192 && b === 168)
  );
}

function isBlockedHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();

  if (
    host === "localhost"
    || host === "::1"
    || host === "[::1]"
    || host.endsWith(".local")
  ) {
    return true;
  }

  if (isPrivateIpv4(host)) {
    return true;
  }

  if (
    host.startsWith("fc")
    || host.startsWith("fd")
    || host.startsWith("fe80:")
  ) {
    return true;
  }

  return false;
}

function validateFeedUrl(feedUrl: string): string {
  const trimmed = feedUrl.trim();

  let parsed: URL;
  try {
    parsed = new URL(trimmed);
  } catch {
    throw new RssProviderError("RSS_INVALID_URL", "Feed URL is invalid.");
  }

  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    throw new RssProviderError("RSS_INVALID_URL", "Feed URL must use HTTP or HTTPS.");
  }

  if (parsed.username || parsed.password) {
    throw new RssProviderError("RSS_INVALID_URL", "Feed URL must not include credentials.");
  }

  if (isBlockedHostname(parsed.hostname)) {
    throw new RssProviderError("RSS_INVALID_URL", "Feed URL host is not allowed.");
  }

  return parsed.toString();
}

export async function fetchRssFeedData(input: {
  feedUrl: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}): Promise<RssProviderResult> {
  const fetchImpl = input.fetchImpl ?? globalThis.fetch;
  const feedUrl = validateFeedUrl(input.feedUrl);
  const timeoutMs =
    typeof input.timeoutMs === "number" && Number.isFinite(input.timeoutMs) && input.timeoutMs > 0
      ? Math.round(input.timeoutMs)
      : DEFAULT_TIMEOUT_MS;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetchImpl(feedUrl, {
      signal: controller.signal,
      headers: {
        Accept: "application/rss+xml, application/atom+xml, application/xml, text/xml;q=0.9, */*;q=0.5",
      },
    });

    if (!response.ok) {
      throw new RssProviderError("RSS_REQUEST_FAILED", `RSS provider request failed with status ${response.status}.`);
    }

    const xml = await response.text();
    if (!xml || xml.trim().length === 0) {
      throw new RssProviderError("RSS_PARSE_FAILED", "RSS provider returned an empty response.");
    }

    if (xml.length > MAX_XML_SIZE_CHARS) {
      throw new RssProviderError("RSS_PARSE_FAILED", "RSS provider response is too large.");
    }

    return parseRssOrAtom(xml, feedUrl);
  } catch (error) {
    if (error instanceof RssProviderError) {
      throw error;
    }

    if (
      typeof error === "object"
      && error !== null
      && "name" in error
      && (error as { name?: unknown }).name === "AbortError"
    ) {
      throw new RssProviderError("RSS_TIMEOUT", "RSS provider request timed out.");
    }

    throw new RssProviderError("RSS_REQUEST_FAILED", "RSS provider request failed.");
  } finally {
    clearTimeout(timeout);
  }
}
