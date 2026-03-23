/**
 * useDeepLinks — listens for incoming deep link URLs and translates them
 * into AppMode transitions.
 *
 * Handles:
 *   - Cold start: app opened via a link while not running
 *   - Already open: app receives a link while foregrounded/backgrounded
 *
 * Invalid or unrecognised links are ignored (no crash, no navigation).
 */

import { useEffect } from "react";
import { Linking } from "react-native";
import { parseDeepLink } from "./deepLinks";
import type { AppMode } from "./appMode.logic";

interface UseDeepLinksOptions {
  /** Called when a valid deep link is received */
  onNavigate: (mode: AppMode) => void;
  /** Whether the user is authenticated (skip links before auth) */
  isAuthenticated: boolean;
}

export function useDeepLinks({ onNavigate, isAuthenticated }: UseDeepLinksOptions): void {
  // Handle links while the app is already running
  useEffect(() => {
    const subscription = Linking.addEventListener("url", ({ url }) => {
      if (!isAuthenticated) {
        return;
      }

      const mode = parseDeepLink(url);
      if (mode) {
        onNavigate(mode);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, onNavigate]);

  // Handle cold-start link (app launched via a deep link)
  useEffect(() => {
    if (!isAuthenticated) {
      return;
    }

    Linking.getInitialURL()
      .then((url) => {
        if (!url) {
          return;
        }

        const mode = parseDeepLink(url);
        if (mode) {
          onNavigate(mode);
        }
      })
      .catch((error) => {
        console.warn("[deep-links] failed to get initial URL", error);
      });
  // Only run once after authentication is confirmed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
