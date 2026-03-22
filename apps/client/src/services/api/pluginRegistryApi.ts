import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";

const TIMEOUT_MS = 8000;

export interface RegistryPlugin {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  activeVersion: { version: string; isActive: boolean } | null;
}

export interface RegistryPluginDetail {
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  activeVersion: {
    id: string;
    version: string;
    manifestJson: unknown;
    changelog: string | null;
  } | null;
}

export async function getRegistryPlugins(): Promise<RegistryPlugin[]> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/plugins`, undefined, TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch plugins: ${message}`);
  }

  return response.json();
}

export async function getRegistryPluginByKey(key: string): Promise<RegistryPluginDetail> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/plugins/${key}`, undefined, TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch plugin '${key}': ${message}`);
  }

  return response.json();
}
