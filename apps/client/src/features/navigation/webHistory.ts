/**
 * webHistory — browser history integration for the web platform.
 *
 * Syncs the custom AppMode state machine with window.history so that:
 *   - Browser back/forward buttons navigate between modes
 *   - Direct URL access and refresh land on the correct mode
 *   - Each mode maps to a hash path (e.g. /#/display)
 *
 * Also handles OAuth callback redirect URLs that arrive as path-based URLs
 * (e.g. /integrations?provider=google&status=success) before the app has
 * normalised them to hash-based navigation.
 *
 * Only active when running on the web platform (Platform.OS === 'web').
 *
 * URL mapping:
 *   admin          → /#/admin   (or just /#/)
 *   display        → /#/display
 *   marketplace    → /#/marketplace
 *   remoteControl  → /#/remote
 *   integrations   → /#/integrations
 */

import { Platform } from "react-native";
import type { AppMode } from "./appMode.logic";
import { parseDeepLinkWithParams, type OAuthCallbackParams } from "./deepLinks";

const MODE_TO_HASH: Record<AppMode, string> = {
  admin: "/",
  display: "/display",
  marketplace: "/marketplace",
  remoteControl: "/remote",
  integrations: "/integrations",
};

const HASH_TO_MODE: Record<string, AppMode> = {
  "/": "admin",
  "": "admin",
  "/admin": "admin",
  "/display": "display",
  "/marketplace": "marketplace",
  "/remote": "remoteControl",
  "/integrations": "integrations",
};

export interface WebOAuthCallbackResult {
  mode: AppMode;
  oauthCallback: OAuthCallbackParams;
}

/**
 * Push a new history entry for the given mode.
 * Only runs on web; no-op on native.
 */
export function pushHistoryEntry(mode: AppMode): void {
  if (Platform.OS !== "web") {
    return;
  }

  const hashPath = MODE_TO_HASH[mode];
  const currentHash = getCurrentHashPath();

  // Avoid duplicate history entries for the same path
  if (currentHash === hashPath) {
    return;
  }

  // Use replaceState for admin (home) to avoid accumulating back-stack entries
  // when the user returns home; use pushState for all other modes.
  if (mode === "admin") {
    window.history.replaceState({ mode }, "", `#${hashPath}`);
  } else {
    window.history.pushState({ mode }, "", `#${hashPath}`);
  }
}

/**
 * Read the current hash path and resolve it to an AppMode.
 * Returns null if the hash doesn't match a known route.
 */
export function modeFromCurrentHash(): AppMode | null {
  if (Platform.OS !== "web") {
    return null;
  }

  const hashPath = getCurrentHashPath();
  return HASH_TO_MODE[hashPath] ?? null;
}

/**
 * Register a popstate listener that fires whenever the user
 * navigates with browser back/forward. Returns a cleanup function.
 */
export function addPopStateListener(
  onNavigate: (mode: AppMode) => void,
): () => void {
  if (Platform.OS !== "web") {
    return () => undefined;
  }

  function handlePopState(event: PopStateEvent) {
    const state = event.state as { mode?: AppMode } | null;

    // Prefer state.mode (set by us); fall back to parsing the hash
    const mode = state?.mode ?? modeFromCurrentHash();
    if (mode) {
      onNavigate(mode);
    }
  }

  window.addEventListener("popstate", handlePopState);

  return () => {
    window.removeEventListener("popstate", handlePopState);
  };
}

function getCurrentHashPath(): string {
  const hash = window.location.hash;
  // Strip the leading '#' to get the path
  return hash ? hash.slice(1) || "/" : "/";
}

/**
 * Detect when the web app is loaded fresh from an OAuth callback redirect.
 * The backend redirects to APP_BASE_URL/integrations?provider=...&status=...
 * which is a non-hash path URL. This function detects that pattern and
 * returns both the target mode and normalised callback params.
 *
 * Returns null when the current URL is not an OAuth callback (e.g. normal
 * hash-based navigation or no status param present).
 *
 * The optional `location` parameter overrides window.location — used in
 * tests running outside a browser environment.
 */
export function parseOAuthCallbackFromPath(
  location?: Pick<typeof window.location, "href" | "hash" | "search">,
): WebOAuthCallbackResult | null {
  if (Platform.OS !== "web") return null;

  const loc = location ?? (typeof window !== "undefined" ? window.location : null);
  if (!loc) return null;

  // Hash-based URLs are handled by modeFromCurrentHash — not a callback redirect
  if (loc.hash) return null;

  // Only process when a status query param is present
  if (!loc.search) return null;

  const result = parseDeepLinkWithParams(loc.href);
  if (!result?.oauthCallback) return null;

  return { mode: result.mode, oauthCallback: result.oauthCallback };
}

/**
 * Replace the current browser URL with the canonical hash-based URL for the
 * given mode. Used to clean up OAuth callback URLs so the back button does
 * not navigate back to a stale redirect.
 */
export function replaceWithHashUrl(mode: AppMode): void {
  if (Platform.OS !== "web") return;
  const hashPath = MODE_TO_HASH[mode];
  window.history.replaceState({ mode }, "", `#${hashPath}`);
}
