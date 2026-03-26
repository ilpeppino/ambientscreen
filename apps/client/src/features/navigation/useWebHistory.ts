/**
 * useWebHistory — syncs AppMode state with browser history on web.
 *
 * - On initial mount, checks for an OAuth callback redirect URL and, if
 *   found, navigates to the target mode with callback params and replaces
 *   the URL with the canonical hash-based equivalent.
 * - Falls back to reading the current hash to restore mode from URL.
 * - Pushes a history entry whenever mode changes.
 * - Listens for popstate (browser back/forward) and calls onNavigate.
 *
 * No-op on native platforms (Platform.OS !== 'web').
 */

import { useEffect } from "react";
import { Platform } from "react-native";
import type { AppMode } from "./appMode.logic";
import type { OAuthCallbackParams } from "./deepLinks";
import {
  addPopStateListener,
  modeFromCurrentHash,
  parseOAuthCallbackFromPath,
  pushHistoryEntry,
  replaceWithHashUrl,
} from "./webHistory";

interface UseWebHistoryOptions {
  mode: AppMode;
  onNavigate: (mode: AppMode, oauthCallback?: OAuthCallbackParams) => void;
}

export function useWebHistory({ mode, onNavigate }: UseWebHistoryOptions): void {
  const isWeb = Platform.OS === "web";

  // Restore mode from URL on initial mount (web only).
  // Checks for an OAuth callback redirect first, then falls back to hash.
  useEffect(() => {
    if (!isWeb) {
      return;
    }

    // Check for OAuth callback (non-hash path-based redirect from backend)
    const callbackResult = parseOAuthCallbackFromPath(window.location);
    if (callbackResult) {
      // Replace the callback URL with the hash-based URL to keep history clean
      replaceWithHashUrl(callbackResult.mode);
      onNavigate(callbackResult.mode, callbackResult.oauthCallback);
      return;
    }

    // Normal hash-based navigation restore
    const initialMode = modeFromCurrentHash();
    if (initialMode && initialMode !== mode) {
      onNavigate(initialMode);
    }
  // Intentionally run once on mount — mode at mount is the initial default
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isWeb]);

  // Push history entry whenever mode changes (web only)
  useEffect(() => {
    if (!isWeb) {
      return;
    }

    pushHistoryEntry(mode);
  }, [isWeb, mode]);

  // Listen for browser back/forward (web only)
  useEffect(() => {
    if (!isWeb) {
      return;
    }

    return addPopStateListener(onNavigate);
  }, [isWeb, onNavigate]);
}
