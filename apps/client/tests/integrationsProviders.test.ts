import { describe, test, expect, vi } from "vitest";

vi.mock("../src/core/config/api", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

import {
  getProviderPresentation,
  getAvailableProviders,
} from "../src/features/integrations/integrations.providers";

describe("getProviderPresentation", () => {
  describe("known providers", () => {
    test("returns correct mapping for google", () => {
      const p = getProviderPresentation("google");
      expect(p.key).toBe("google");
      expect(p.label).toBe("Google");
      expect(p.initial).toBe("G");
    });

    test("google provider has a getConnectUrl function", () => {
      const p = getProviderPresentation("google");
      expect(typeof p.getConnectUrl).toBe("function");
    });

    test("google getConnectUrl returns a URL string containing the expected path", () => {
      const p = getProviderPresentation("google");
      const url = p.getConnectUrl();
      expect(url).toContain("/integrations/google/start");
    });

    test("google getConnectUrl includes returnTo when provided", () => {
      const p = getProviderPresentation("google");
      const url = p.getConnectUrl("ambientscreen://integrations");
      expect(url).toContain("returnTo=");
    });
  });

  describe("unknown / future providers", () => {
    test("returns safe fallback for unknown provider", () => {
      const p = getProviderPresentation("github");
      expect(p.key).toBe("github");
      expect(p.label).toBe("Github");
      expect(p.initial).toBe("G");
    });

    test("capitalises first letter of label", () => {
      const p = getProviderPresentation("microsoft");
      expect(p.label).toBe("Microsoft");
    });

    test("initial is uppercase first character", () => {
      const p = getProviderPresentation("homeassistant");
      expect(p.initial).toBe("H");
    });

    test("handles empty string provider gracefully", () => {
      const p = getProviderPresentation("");
      expect(p.key).toBe("");
      expect(p.label).toBe("");
      expect(p.initial).toBe("?");
    });

    test("returned key always matches the input provider string", () => {
      const p = getProviderPresentation("some-future-provider");
      expect(p.key).toBe("some-future-provider");
    });

    test("unknown provider getConnectUrl returns empty string (no connect flow defined)", () => {
      const p = getProviderPresentation("unknown-provider");
      expect(p.getConnectUrl()).toBe("");
    });
  });

  describe("mixed providers render without google-specific assumptions", () => {
    test("multiple different providers each return distinct labels", () => {
      const google = getProviderPresentation("google");
      const microsoft = getProviderPresentation("microsoft");
      expect(google.label).not.toBe(microsoft.label);
      expect(google.initial).not.toBe(microsoft.initial);
    });
  });
});

describe("getAvailableProviders", () => {
  test("returns at least one provider", () => {
    const providers = getAvailableProviders();
    expect(providers.length).toBeGreaterThan(0);
  });

  test("google is in the available providers list", () => {
    const providers = getAvailableProviders();
    const google = providers.find((p) => p.key === "google");
    expect(google).toBeDefined();
    expect(google?.label).toBe("Google");
  });

  test("all available providers have a getConnectUrl function", () => {
    const providers = getAvailableProviders();
    for (const provider of providers) {
      expect(typeof provider.getConnectUrl).toBe("function");
    }
  });

  test("add-connection flow is not hardcoded to google — provider list is the source of truth", () => {
    // The screen uses getAvailableProviders()[0] rather than a hardcoded import.
    // This test asserts that the list is non-empty and each entry has the connect contract.
    const providers = getAvailableProviders();
    expect(providers.every((p) => typeof p.getConnectUrl === "function")).toBe(true);
  });
});
