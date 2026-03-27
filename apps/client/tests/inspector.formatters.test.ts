import { describe, it, expect } from "vitest";
import {
  formatBoolean,
  formatEnum,
  formatProvider,
  formatTimeWindow,
  formatDisplayValue,
} from "../src/features/admin/inspector/inspector.formatters";

describe("formatBoolean", () => {
  it("formats true as Yes", () => {
    expect(formatBoolean(true)).toBe("Yes");
  });

  it("formats false as No", () => {
    expect(formatBoolean(false)).toBe("No");
  });

  it("formats null as —", () => {
    expect(formatBoolean(null)).toBe("—");
  });

  it("formats undefined as —", () => {
    expect(formatBoolean(undefined)).toBe("—");
  });

  it("does not expose raw boolean values", () => {
    expect(formatBoolean(true)).not.toBe("true");
    expect(formatBoolean(false)).not.toBe("false");
  });
});

describe("formatEnum", () => {
  const map = { a: "Alpha", b: "Beta" };

  it("maps known values", () => {
    expect(formatEnum("a", map)).toBe("Alpha");
    expect(formatEnum("b", map)).toBe("Beta");
  });

  it("returns fallback for unknown values", () => {
    expect(formatEnum("z", map)).toBe("—");
  });

  it("returns custom fallback when provided", () => {
    expect(formatEnum("z", map, "Unknown")).toBe("Unknown");
  });

  it("returns fallback for null", () => {
    expect(formatEnum(null, map)).toBe("—");
  });

  it("returns fallback for undefined", () => {
    expect(formatEnum(undefined, map)).toBe("—");
  });

  it("returns fallback for empty string", () => {
    expect(formatEnum("", map)).toBe("—");
  });
});

describe("formatProvider", () => {
  it("formats google", () => {
    expect(formatProvider("google")).toBe("Google Calendar");
  });

  it("formats ical", () => {
    expect(formatProvider("ical")).toBe("iCal Feed");
  });

  it("never exposes raw enum value", () => {
    expect(formatProvider("google")).not.toBe("google");
    expect(formatProvider("ical")).not.toBe("ical");
  });

  it("returns — for unknown provider", () => {
    expect(formatProvider("yahoo")).toBe("—");
  });

  it("returns — for null", () => {
    expect(formatProvider(null)).toBe("—");
  });
});

describe("formatTimeWindow", () => {
  it("formats today", () => {
    expect(formatTimeWindow("today")).toBe("Today");
  });

  it("formats next24h", () => {
    expect(formatTimeWindow("next24h")).toBe("Next 24h");
  });

  it("formats next7d", () => {
    expect(formatTimeWindow("next7d")).toBe("Next 7 days");
  });

  it("never exposes raw enum values", () => {
    expect(formatTimeWindow("next7d")).not.toBe("next7d");
    expect(formatTimeWindow("next24h")).not.toBe("next24h");
  });

  it("returns — for unknown value", () => {
    expect(formatTimeWindow("next30d")).toBe("—");
  });
});

describe("formatDisplayValue", () => {
  it("returns — for null", () => {
    expect(formatDisplayValue("text", null)).toBe("—");
  });

  it("returns — for undefined", () => {
    expect(formatDisplayValue("text", undefined)).toBe("—");
  });

  it("matches option label when options provided", () => {
    const options = [
      { label: "First", value: "a" },
      { label: "Second", value: "b" },
    ];
    expect(formatDisplayValue("segmented", "a", options)).toBe("First");
    expect(formatDisplayValue("segmented", "b", options)).toBe("Second");
  });

  it("formats booleans when no matching option", () => {
    expect(formatDisplayValue("boolean", true)).toBe("Yes");
    expect(formatDisplayValue("boolean", false)).toBe("No");
  });

  it("stringifies other values", () => {
    expect(formatDisplayValue("text", "hello")).toBe("hello");
    expect(formatDisplayValue("segmented", 10)).toBe("10");
  });
});
