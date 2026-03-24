import type { EntitlementsResponse } from "@ambient/shared-contracts";
import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";

export async function getEntitlements(): Promise<EntitlementsResponse> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/entitlements`);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch entitlements: ${message}`);
  }

  return response.json();
}
