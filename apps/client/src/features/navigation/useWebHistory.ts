/**
 * useWebHistory — syncs AppMode state with browser history on web.
 *
 * - Pushes a history entry whenever mode changes
 * - Listens for popstate (browser back/forward) and calls onNavigate
 * - On initial mount, reads current hash to restore mode from URL
 *
 * No-op on native platforms (Platform.OS !== 'web').
 */

import { useEffect } from "react";
import { Platform } from "react-native";
import type { AppMode } from "./appMode.logic";
import { addPopStateListener, modeFromCurrentHash, pushHistoryEntry } from "./webHistory";

interface UseWebHistoryOptions {
  mode: AppMode;
  onNavigate: (mode: AppMode) => void;
}

export function useWebHistory({ mode, onNavigate }: UseWebHistoryOptions): void {
  const isWeb = Platform.OS === "web";

  // Restore mode from URL on initial mount (web only)
  useEffect(() => {
    if (!isWeb) {
      return;
    }

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
