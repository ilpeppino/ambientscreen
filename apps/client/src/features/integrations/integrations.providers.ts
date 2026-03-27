/**
 * Provider presentation mapping for the integrations feature.
 *
 * This is the single place where provider-specific display metadata lives.
 * The tile component and screen shell consume this — they contain no
 * provider-specific conditionals themselves.
 *
 * To add a future provider (e.g. GitHub, Microsoft):
 *   1. Add an entry to PROVIDERS below.
 *   2. Add the connect-URL helper to integrationsApi.ts.
 *   3. No other UI changes needed.
 */

import { getGoogleConnectUrl } from "../../services/api/integrationsApi";

export interface IntegrationProviderPresentation {
  /** Canonical provider key, matching the `provider` field on IntegrationConnection. */
  key: string;
  /** Human-readable display label shown in the tile header. */
  label: string;
  /** Single uppercase letter used as the fallback provider mark in the tile. */
  initial: string;
  /**
   * Returns the URL to start an OAuth connection flow for this provider.
   * This is retained for legacy presentation helpers, but the Add Connection
   * flow now loads providers from the backend and resolves the URL through the
   * authenticated API layer.
   */
  getConnectUrl: (returnTo?: string) => Promise<string>;
}

const PROVIDERS: Record<string, IntegrationProviderPresentation> = {
  google: {
    key: "google",
    label: "Google",
    initial: "G",
    getConnectUrl: getGoogleConnectUrl,
  },
};

/**
 * Returns all registered provider presentations.
 * Used by the screen to build the Add Connection flow without knowing
 * which providers are available at compile time.
 */
export function getAvailableProviders(): IntegrationProviderPresentation[] {
  return Object.values(PROVIDERS);
}

/**
 * Returns display metadata for a given provider key.
 * Falls back gracefully for unknown providers so future integrations
 * render without crashing, even before their entry is added here.
 */
export function getProviderPresentation(provider: string): IntegrationProviderPresentation {
  const known = PROVIDERS[provider];
  if (known) return known;

  const label =
    provider.length > 0 ? provider.charAt(0).toUpperCase() + provider.slice(1) : provider;
  const initial = provider.length > 0 ? provider.charAt(0).toUpperCase() : "?";

  return { key: provider, label, initial, getConnectUrl: async () => "" };
}
