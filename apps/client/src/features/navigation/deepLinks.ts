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
 *
 * Invalid or unrecognised paths fall back to admin mode.
 */

import type { AppMode } from "./appMode.logic";

// Custom scheme registered in app.json / Expo config
export const DEEP_LINK_SCHEME = "ambientscreen";

export type DeepLinkRoute = "display" | "marketplace" | "remote" | "admin";

const ROUTE_TO_MODE: Record<DeepLinkRoute, AppMode> = {
  display: "display",
  marketplace: "marketplace",
  remote: "remoteControl",
  admin: "admin",
};

/**
 * Parse a raw deep link URL string into an AppMode.
 * Returns null if the URL is not a recognised Ambient Screen link.
 */
export function parseDeepLink(url: string): AppMode | null {
  try {
    const parsed = new URL(url);

    // Native scheme: ambientscreen://display
    if (parsed.protocol === `${DEEP_LINK_SCHEME}:`) {
      const route = normalisePathSegment(parsed.hostname || parsed.pathname);
      return routeToMode(route);
    }

    // Web hash-based: https://host/#/display
    if (parsed.hash) {
      const hashPath = parsed.hash.replace(/^#\/?/, "");
      const route = normalisePathSegment(hashPath.split("/")[0] ?? "");
      return routeToMode(route);
    }

    // Web path-based: https://host/display
    const pathSegment = parsed.pathname.replace(/^\//, "").split("/")[0] ?? "";
    if (pathSegment) {
      return routeToMode(normalisePathSegment(pathSegment));
    }

    return null;
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
