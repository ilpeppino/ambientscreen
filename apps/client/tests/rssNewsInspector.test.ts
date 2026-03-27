import { describe, expect, it, vi } from "vitest";
import { getInspectorDefinition } from "../src/widgets/rssNews/inspector";
import type { RssNewsConfig, RssNewsInspectorContext } from "../src/widgets/rssNews/inspector";

function makeConfig(overrides: Partial<RssNewsConfig> = {}): RssNewsConfig {
  return {
    feedUrl: "https://news.example.com/rss.xml",
    maxItems: 5,
    showImages: true,
    showPublishedAt: true,
    layout: "headline-list",
    title: "Latest News",
    ...overrides,
  };
}

function makeContext(onChange = vi.fn()): RssNewsInspectorContext {
  return { onChange };
}

describe("rssNews getInspectorDefinition", () => {
  it("returns sections in canonical order: source, display", () => {
    const def = getInspectorDefinition(makeConfig(), makeContext());
    expect(def.sections).toHaveLength(2);
    expect(def.sections[0].id).toBe("source");
    expect(def.sections[1].id).toBe("display");
  });

  it("uses human-readable displayValue for layout", () => {
    const def = getInspectorDefinition(makeConfig({ layout: "headline-list" }), makeContext());
    const layoutField = def.sections[1].fields.find((field) => field.id === "layout");
    expect(layoutField?.displayValue).toBe("Headline list");
    expect(layoutField?.displayValue).not.toBe("headline-list");
  });

  it("uses yes/no display values for boolean fields", () => {
    const def = getInspectorDefinition(
      makeConfig({ showImages: false, showPublishedAt: true }),
      makeContext(),
    );
    const imagesField = def.sections[1].fields.find((field) => field.id === "showImages");
    const publishedField = def.sections[1].fields.find((field) => field.id === "showPublishedAt");

    expect(imagesField?.displayValue).toBe("No");
    expect(publishedField?.displayValue).toBe("Yes");
  });

  it("delegates onChange for feed URL field", () => {
    const onChange = vi.fn();
    const def = getInspectorDefinition(makeConfig(), makeContext(onChange));
    const feedUrlField = def.sections[0].fields.find((field) => field.id === "feedUrl");

    feedUrlField?.onChange?.("https://another.example.com/feed.xml" as never);
    expect(onChange).toHaveBeenCalledWith({
      feedUrl: "https://another.example.com/feed.xml",
    });
  });
});
