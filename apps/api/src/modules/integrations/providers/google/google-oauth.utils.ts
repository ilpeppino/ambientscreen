import { getAppBaseUrl } from "../../../../core/config/env";

/**
 * Whitelist check for OAuth return targets.
 * Only allow the native app scheme and same-origin web URLs to prevent
 * open redirect attacks.
 */
export function isAllowedReturnTo(returnTo: string, appBaseUrl = getAppBaseUrl()): boolean {
  if (returnTo.startsWith("ambientscreen://")) return true;

  try {
    const returnUrl = new URL(returnTo);
    const baseUrl = new URL(appBaseUrl);
    return returnUrl.origin === baseUrl.origin;
  } catch {
    return false;
  }
}
