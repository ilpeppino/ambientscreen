/**
 * useDeepLinks — listens for incoming deep link URLs and translates them
 * into AppMode transitions.
 *
 * Handles:
 *   - Cold start: app opened via a link while not running (native only)
 *   - Already open: app receives a link while foregrounded/backgrounded
 *
 * On web, initial URL handling is delegated to useWebHistory which reads
 * window.location directly and handles OAuth callback redirects. This hook
 * only processes runtime link events on web.
 *
 * Invalid or unrecognised links are ignored (no crash, no navigation).
 */

import { useEffect } from "react";
import { Linking, Platform } from "react-native";
import { parseDeepLinkWithParams, type OAuthCallbackParams } from "./deepLinks";
import type { AppMode } from "./appMode.logic";

interface UseDeepLinksOptions {
  /** Called when a valid deep link is received */
  onNavigate: (mode: AppMode, oauthCallback?: OAuthCallbackParams) => void;
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

      const result = parseDeepLinkWithParams(url);
      if (result) {
        onNavigate(result.mode, result.oauthCallback);
      }
    });

    return () => {
      subscription.remove();
    };
  }, [isAuthenticated, onNavigate]);

  // Handle cold-start link (app launched via a deep link).
  // Skipped on web — useWebHistory handles the initial URL there.
  useEffect(() => {
    if (!isAuthenticated || Platform.OS === "web") {
      return;
    }

    Linking.getInitialURL()
      .then((url) => {
        if (!url) {
          return;
        }

        const result = parseDeepLinkWithParams(url);
        if (result) {
          onNavigate(result.mode, result.oauthCallback);
        }
      })
      .catch((error) => {
        console.warn("[deep-links] failed to get initial URL", error);
      });
  // Only run once after authentication is confirmed
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);
}
