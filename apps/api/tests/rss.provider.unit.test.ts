import { afterEach, expect, test, vi } from "vitest";
import { fetchRssFeedData, RssProviderError } from "../src/modules/widgetData/providers/rss.provider";

afterEach(() => {
  vi.restoreAllMocks();
});

test("fetchRssFeedData parses RSS XML channel and items", async () => {
  const rssXml = [
    "<?xml version=\"1.0\" encoding=\"UTF-8\"?>",
    "<rss version=\"2.0\">",
    "<channel>",
    "<title>Example News</title>",
    "<link>https://news.example.com</link>",
    "<description>Daily headlines</description>",
    "<item>",
    "<guid>n1</guid>",
    "<title>Headline 1</title>",
    "<link>https://news.example.com/n1</link>",
    "<description><![CDATA[<p>Summary 1</p>]]></description>",
    "<pubDate>Fri, 27 Mar 2026 08:00:00 GMT</pubDate>",
    "<enclosure url=\"https://cdn.example.com/n1.jpg\" type=\"image/jpeg\"/>",
    "</item>",
    "</channel>",
    "</rss>",
  ].join("");

  const result = await fetchRssFeedData({
    feedUrl: "https://news.example.com/rss.xml",
    fetchImpl: async () => new Response(rssXml, { status: 200 }),
  });

  expect(result.format).toBe("rss");
  expect(result.channel.title).toBe("Example News");
  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.title).toBe("Headline 1");
  expect(result.items[0]?.summary).toBe("Summary 1");
  expect(result.items[0]?.imageUrl).toBe("https://cdn.example.com/n1.jpg");
});

test("fetchRssFeedData parses Atom XML entries", async () => {
  const atomXml = [
    "<?xml version=\"1.0\" encoding=\"utf-8\"?>",
    "<feed xmlns=\"http://www.w3.org/2005/Atom\">",
    "<title>Atom Feed</title>",
    "<entry>",
    "<id>tag:example.com,2026:1</id>",
    "<title>Atom headline</title>",
    "<link href=\"https://news.example.com/atom-1\"/>",
    "<updated>2026-03-27T08:00:00Z</updated>",
    "<summary>Atom summary</summary>",
    "</entry>",
    "</feed>",
  ].join("");

  const result = await fetchRssFeedData({
    feedUrl: "https://news.example.com/atom.xml",
    fetchImpl: async () => new Response(atomXml, { status: 200 }),
  });

  expect(result.format).toBe("atom");
  expect(result.channel.title).toBe("Atom Feed");
  expect(result.items).toHaveLength(1);
  expect(result.items[0]?.id).toBe("tag:example.com,2026:1");
  expect(result.items[0]?.link).toBe("https://news.example.com/atom-1");
});

test("fetchRssFeedData rejects unsupported URL schemes", async () => {
  await expect(
    fetchRssFeedData({
      feedUrl: "ftp://news.example.com/rss.xml",
      fetchImpl: async () => new Response("", { status: 200 }),
    }),
  ).rejects.toEqual(expect.objectContaining<RssProviderError>({
    code: "RSS_INVALID_URL",
  }));
});

test("fetchRssFeedData rejects localhost/private hosts", async () => {
  await expect(
    fetchRssFeedData({
      feedUrl: "http://127.0.0.1/rss.xml",
      fetchImpl: async () => new Response("", { status: 200 }),
    }),
  ).rejects.toEqual(expect.objectContaining<RssProviderError>({
    code: "RSS_INVALID_URL",
  }));
});

test("fetchRssFeedData returns timeout error when request hangs", async () => {
  const fetchImpl: typeof fetch = async (_url, init) => {
    return new Promise<Response>((_resolve, reject) => {
      const signal = init?.signal;
      if (!signal) {
        reject(new Error("missing signal"));
        return;
      }

      signal.addEventListener("abort", () => {
        const abortError = new Error("aborted");
        (abortError as Error & { name: string }).name = "AbortError";
        reject(abortError);
      });
    });
  };

  await expect(
    fetchRssFeedData({
      feedUrl: "https://news.example.com/rss.xml",
      timeoutMs: 5,
      fetchImpl,
    }),
  ).rejects.toEqual(expect.objectContaining<RssProviderError>({
    code: "RSS_TIMEOUT",
  }));
});
