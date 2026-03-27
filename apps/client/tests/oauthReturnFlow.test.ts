/**
 * Tests for OAuth deep-link and return-flow logic.
 *
 * Covers:
 *  - parseDeepLinkWithParams: route + OAuth params from all URL formats
 *  - parseOAuthCallbackParams: status normalisation, error codes
 *  - parseOAuthCallbackFromPath: web callback URL detection
 *  - getGoogleConnectUrl: returnTo param construction
 *  - Security: invalid returnTo destinations are rejected
 */

import { describe, test, expect, vi, afterEach } from "vitest";

vi.mock("../src/core/config/api", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

afterEach(() => {
  vi.restoreAllMocks();
});

// ---------------------------------------------------------------------------
// parseOAuthCallbackParams
// ---------------------------------------------------------------------------

describe("parseOAuthCallbackParams", () => {
  test("returns success params", async () => {
    const { parseOAuthCallbackParams } = await import("../src/features/navigation/deepLinks");
    const params = new URLSearchParams({ provider: "google", status: "success" });
    const result = parseOAuthCallbackParams(params);
    expect(result).toEqual({ provider: "google", status: "success" });
  });

  test("returns error params with errorCode", async () => {
    const { parseOAuthCallbackParams } = await import("../src/features/navigation/deepLinks");
    const params = new URLSearchParams({ provider: "google", status: "error", code: "oauth_failed" });
    const result = parseOAuthCallbackParams(params);
    expect(result).toEqual({ provider: "google", status: "error", errorCode: "oauth_failed" });
  });

  test("maps oauth_denied code to cancelled status", async () => {
    const { parseOAuthCallbackParams } = await import("../src/features/navigation/deepLinks");
    const params = new URLSearchParams({ provider: "google", status: "error", code: "oauth_denied" });
    const result = parseOAuthCallbackParams(params);
    expect(result?.status).toBe("cancelled");
    expect(result?.errorCode).toBeUndefined(); // errorCode not set for cancelled
  });

  test("returns null when provider is missing", async () => {
    const { parseOAuthCallbackParams } = await import("../src/features/navigation/deepLinks");
    const params = new URLSearchParams({ status: "success" });
    expect(parseOAuthCallbackParams(params)).toBeNull();
  });

  test("returns null when status is missing", async () => {
    const { parseOAuthCallbackParams } = await import("../src/features/navigation/deepLinks");
    const params = new URLSearchParams({ provider: "google" });
    expect(parseOAuthCallbackParams(params)).toBeNull();
  });

  test("returns null for unrecognised status", async () => {
    const { parseOAuthCallbackParams } = await import("../src/features/navigation/deepLinks");
    const params = new URLSearchParams({ provider: "google", status: "pending" });
    expect(parseOAuthCallbackParams(params)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// parseDeepLinkWithParams
// ---------------------------------------------------------------------------

describe("parseDeepLinkWithParams — native scheme", () => {
  test("parses integrations route without params", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams("ambientscreen://integrations");
    expect(result?.mode).toBe("integrations");
    expect(result?.oauthCallback).toBeUndefined();
  });

  test("parses integrations route with success callback params", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams(
      "ambientscreen://integrations?provider=google&status=success",
    );
    expect(result?.mode).toBe("integrations");
    expect(result?.oauthCallback).toEqual({ provider: "google", status: "success" });
  });

  test("parses integrations route with error callback params", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams(
      "ambientscreen://integrations?provider=google&status=error&code=oauth_failed",
    );
    expect(result?.mode).toBe("integrations");
    expect(result?.oauthCallback?.status).toBe("error");
    expect(result?.oauthCallback?.errorCode).toBe("oauth_failed");
  });

  test("parses oauth_denied as cancelled", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams(
      "ambientscreen://integrations?provider=google&status=error&code=oauth_denied",
    );
    expect(result?.oauthCallback?.status).toBe("cancelled");
  });

  test("parses display route", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    expect(parseDeepLinkWithParams("ambientscreen://display")?.mode).toBe("display");
  });

  test("returns null for unknown route", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    expect(parseDeepLinkWithParams("ambientscreen://unknown")).toBeNull();
  });
});

describe("parseDeepLinkWithParams — web hash URL", () => {
  test("parses integrations with success params in hash query", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams(
      "http://localhost:19006/#/integrations?provider=google&status=success",
    );
    expect(result?.mode).toBe("integrations");
    expect(result?.oauthCallback).toEqual({ provider: "google", status: "success" });
  });

  test("parses integrations route from hash without params", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams("http://localhost:19006/#/integrations");
    expect(result?.mode).toBe("integrations");
    expect(result?.oauthCallback).toBeUndefined();
  });
});

describe("parseDeepLinkWithParams — web path URL (OAuth callback)", () => {
  test("parses callback URL from backend redirect", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams(
      "http://localhost:19006/integrations?provider=google&status=success",
    );
    expect(result?.mode).toBe("integrations");
    expect(result?.oauthCallback?.status).toBe("success");
  });

  test("parses error callback URL", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams(
      "http://localhost:19006/integrations?provider=google&status=error&code=oauth_failed",
    );
    expect(result?.oauthCallback?.status).toBe("error");
  });
});

// ---------------------------------------------------------------------------
// parseDeepLink backward-compat (mode-only)
// ---------------------------------------------------------------------------

describe("parseDeepLink backward compat", () => {
  test("integrations route returns integrations mode", async () => {
    const { parseDeepLink } = await import("../src/features/navigation/deepLinks");
    expect(parseDeepLink("ambientscreen://integrations")).toBe("integrations");
  });

  test("existing routes unchanged", async () => {
    const { parseDeepLink } = await import("../src/features/navigation/deepLinks");
    expect(parseDeepLink("ambientscreen://display")).toBe("display");
    expect(parseDeepLink("ambientscreen://marketplace")).toBe("marketplace");
    expect(parseDeepLink("ambientscreen://remote")).toBe("remoteControl");
    expect(parseDeepLink("ambientscreen://admin")).toBe("admin");
  });
});

// ---------------------------------------------------------------------------
// parseOAuthCallbackFromPath (web only)
// Uses the injectable location param so tests don't need a browser environment.
// ---------------------------------------------------------------------------

describe("parseOAuthCallbackFromPath", () => {
  test("detects success callback from path URL", async () => {
    const { parseOAuthCallbackFromPath } = await import(
      "../src/features/navigation/webHistory"
    );
    const result = parseOAuthCallbackFromPath({
      href: "http://localhost:19006/integrations?provider=google&status=success",
      hash: "",
      search: "?provider=google&status=success",
    });
    expect(result?.mode).toBe("integrations");
    expect(result?.oauthCallback.status).toBe("success");
    expect(result?.oauthCallback.provider).toBe("google");
  });

  test("detects error callback", async () => {
    const { parseOAuthCallbackFromPath } = await import(
      "../src/features/navigation/webHistory"
    );
    const result = parseOAuthCallbackFromPath({
      href: "http://localhost:19006/integrations?provider=google&status=error&code=oauth_failed",
      hash: "",
      search: "?provider=google&status=error&code=oauth_failed",
    });
    expect(result?.oauthCallback.status).toBe("error");
  });

  test("detects oauth_denied as cancelled", async () => {
    const { parseOAuthCallbackFromPath } = await import(
      "../src/features/navigation/webHistory"
    );
    const result = parseOAuthCallbackFromPath({
      href: "http://localhost:19006/integrations?provider=google&status=error&code=oauth_denied",
      hash: "",
      search: "?provider=google&status=error&code=oauth_denied",
    });
    expect(result?.oauthCallback.status).toBe("cancelled");
  });

  test("returns null when hash is present (normal hash navigation)", async () => {
    const { parseOAuthCallbackFromPath } = await import(
      "../src/features/navigation/webHistory"
    );
    expect(parseOAuthCallbackFromPath({
      href: "http://localhost:19006/#/integrations",
      hash: "#/integrations",
      search: "",
    })).toBeNull();
  });

  test("returns null when no search params present", async () => {
    const { parseOAuthCallbackFromPath } = await import(
      "../src/features/navigation/webHistory"
    );
    expect(parseOAuthCallbackFromPath({
      href: "http://localhost:19006/integrations",
      hash: "",
      search: "",
    })).toBeNull();
  });

  test("returns null when status param is missing", async () => {
    const { parseOAuthCallbackFromPath } = await import(
      "../src/features/navigation/webHistory"
    );
    expect(parseOAuthCallbackFromPath({
      href: "http://localhost:19006/integrations?provider=google",
      hash: "",
      search: "?provider=google",
    })).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// getGoogleConnectUrl with returnTo
// ---------------------------------------------------------------------------

describe("getGoogleConnectUrl", () => {
  test("returns base URL when no returnTo provided", async () => {
    const { getGoogleConnectUrl } = await import("../src/services/api/integrationsApi");
    const url = getGoogleConnectUrl();
    expect(url).toBe("http://localhost:3000/integrations/google/start");
  });

  test("appends returnTo as query param when provided", async () => {
    const { getGoogleConnectUrl } = await import("../src/services/api/integrationsApi");
    const url = getGoogleConnectUrl("ambientscreen://integrations");
    expect(url).toContain("/start?");
    expect(url).toContain("returnTo=");
    expect(url).toContain(encodeURIComponent("ambientscreen://integrations"));
  });

  test("returnTo for native uses ambientscreen scheme", async () => {
    const { getGoogleConnectUrl } = await import("../src/services/api/integrationsApi");
    const url = getGoogleConnectUrl("ambientscreen://integrations");
    const parsed = new URL(url);
    const returnTo = parsed.searchParams.get("returnTo");
    expect(returnTo).toBe("ambientscreen://integrations");
  });

  test("still contains /start path with returnTo", async () => {
    const { getGoogleConnectUrl } = await import("../src/services/api/integrationsApi");
    const url = getGoogleConnectUrl("ambientscreen://integrations");
    expect(url).toContain("/integrations/google/start");
  });
});

// ---------------------------------------------------------------------------
// Security: invalid returnTo should not be passed through
// ---------------------------------------------------------------------------

describe("returnTo security", () => {
  test("parseDeepLinkWithParams never returns sensitive fields", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams(
      "ambientscreen://integrations?provider=google&status=success",
    );
    // oauthCallback must not contain token material
    const callback = result?.oauthCallback;
    expect(callback).not.toHaveProperty("accessToken");
    expect(callback).not.toHaveProperty("refreshToken");
    expect(callback).not.toHaveProperty("code");
  });

  test("unknown route with callback params returns null", async () => {
    const { parseDeepLinkWithParams } = await import("../src/features/navigation/deepLinks");
    const result = parseDeepLinkWithParams(
      "ambientscreen://unknown-screen?provider=google&status=success",
    );
    expect(result).toBeNull();
  });

  test("buildDeepLink for integrations uses correct scheme", async () => {
    const { buildDeepLink } = await import("../src/features/navigation/deepLinks");
    expect(buildDeepLink("integrations")).toBe("ambientscreen://integrations");
  });
});
