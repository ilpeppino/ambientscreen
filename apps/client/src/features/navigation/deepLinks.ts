/**
 * Deep link support for Ambient Screen.
 *
 * URL scheme:
 *   Mobile (custom scheme): ambientscreen://<path>
 *   Web (hash-based):       https://<host>/#/<path>
 *
 * Supported entry points:
 *   /display        → enter display mode
 *   /marketplace    → open marketplace
 *   /remote         → open remote control
 *   /admin          → go to admin home (default)
 *   /integrations   → open integrations screen
 *
 * Invalid or unrecognised paths fall back to admin mode.
 */

import type { AppMode } from "./appMode.logic";

// Custom scheme registered in app.json / Expo config
export const DEEP_LINK_SCHEME = "ambientscreen";

export type DeepLinkRoute = "display" | "marketplace" | "remote" | "admin" | "integrations";

const ROUTE_TO_MODE: Record<DeepLinkRoute, AppMode> = {
  display: "display",
  marketplace: "marketplace",
  remote: "remoteControl",
  admin: "admin",
  integrations: "integrations",
};

// ---------------------------------------------------------------------------
// OAuth callback params
// ---------------------------------------------------------------------------

export type OAuthStatus = "success" | "error" | "cancelled";

/**
 * Safe, normalised OAuth callback context. Never contains tokens or raw
 * provider error messages.
 */
export interface OAuthCallbackParams {
  provider: string;
  status: OAuthStatus;
  /** Normalised error code — only present when status is "error". */
  errorCode?: string;
}

/**
 * Parse OAuth callback query params from a URLSearchParams instance.
 * Returns null when the required params are absent or unrecognised.
 */
export function parseOAuthCallbackParams(
  searchParams: URLSearchParams,
): OAuthCallbackParams | null {
  const provider = searchParams.get("provider");
  const statusRaw = searchParams.get("status");

  if (!provider || (statusRaw !== "success" && statusRaw !== "error")) {
    return null;
  }

  const rawCode = searchParams.get("code") ?? undefined;

  let status: OAuthStatus;
  if (statusRaw === "success") {
    status = "success";
  } else if (rawCode === "oauth_denied") {
    status = "cancelled";
  } else {
    status = "error";
  }

  return { provider, status, ...(rawCode && status === "error" ? { errorCode: rawCode } : {}) };
}

// ---------------------------------------------------------------------------
// Deep link parsers
// ---------------------------------------------------------------------------

/**
 * Parse a raw deep link URL string into an AppMode.
 * Returns null if the URL is not a recognised Ambient Screen link.
 */
export function parseDeepLink(url: string): AppMode | null {
  return parseDeepLinkWithParams(url)?.mode ?? null;
}

/**
 * Parse a raw deep link URL string into an AppMode plus optional OAuth
 * callback params. Returns null if the URL is not a recognised link.
 */
export function parseDeepLinkWithParams(
  url: string,
): { mode: AppMode; oauthCallback?: OAuthCallbackParams } | null {
  try {
    const parsed = new URL(url);
    let route = "";
    let searchParams: URLSearchParams;

    // Native scheme: ambientscreen://integrations?provider=google&status=success
    if (parsed.protocol === `${DEEP_LINK_SCHEME}:`) {
      route = normalisePathSegment(parsed.hostname || parsed.pathname.replace(/^\//, ""));
      searchParams = parsed.searchParams;
    } else if (parsed.hash) {
      // Web hash-based: https://host/#/integrations?provider=google&status=success
      const hashContent = parsed.hash.replace(/^#\/?/, "");
      const qMark = hashContent.indexOf("?");
      const hashPath = qMark >= 0 ? hashContent.slice(0, qMark) : hashContent;
      const hashQuery = qMark >= 0 ? hashContent.slice(qMark + 1) : "";
      route = normalisePathSegment(hashPath.split("/")[0] ?? "");
      searchParams = new URLSearchParams(hashQuery);
    } else {
      // Web path-based: https://host/integrations?provider=google&status=success
      const pathSegment = parsed.pathname.replace(/^\//, "").split("/")[0] ?? "";
      route = normalisePathSegment(pathSegment);
      searchParams = parsed.searchParams;
    }

    const mode = routeToMode(route);
    if (!mode) return null;

    const oauthCallback = parseOAuthCallbackParams(searchParams) ?? undefined;
    return { mode, ...(oauthCallback ? { oauthCallback } : {}) };
  } catch {
    return null;
  }
}

function normalisePathSegment(segment: string): string {
  return segment.toLowerCase().trim();
}

function routeToMode(route: string): AppMode | null {
  if (route in ROUTE_TO_MODE) {
    return ROUTE_TO_MODE[route as DeepLinkRoute];
  }

  return null;
}

/**
 * Build a deep link URL for a given route (useful for sharing/testing).
 */
export function buildDeepLink(route: DeepLinkRoute): string {
  return `${DEEP_LINK_SCHEME}://${route}`;
}
