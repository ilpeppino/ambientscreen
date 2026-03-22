import { API_BASE_URL } from "../../core/config/api";
import { apiFetchWithTimeout, toApiErrorMessage } from "./apiClient";

const TIMEOUT_MS = 8000;

export interface InstalledPluginEntry {
  id: string;
  pluginId: string;
  isEnabled: boolean;
  installedAt: string;
  plugin: {
    id: string;
    key: string;
    name: string;
    description: string;
    category: string;
    isPremium: boolean;
    activeVersion: { id: string; version: string; isActive: boolean } | null;
  };
}

export async function getInstalledPlugins(): Promise<InstalledPluginEntry[]> {
  const response = await apiFetchWithTimeout(`${API_BASE_URL}/me/plugins`, undefined, TIMEOUT_MS);

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to fetch installed plugins: ${message}`);
  }

  return response.json();
}

export async function installPlugin(pluginId: string): Promise<{ id: string; pluginId: string; isEnabled: boolean }> {
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/plugins/${pluginId}/install`,
    { method: "POST" },
    TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to install plugin: ${message}`);
  }

  return response.json();
}

export async function uninstallPlugin(pluginId: string): Promise<void> {
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/plugins/${pluginId}/install`,
    { method: "DELETE" },
    TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to uninstall plugin: ${message}`);
  }
}

export async function setPluginEnabled(pluginId: string, isEnabled: boolean): Promise<{ id: string; pluginId: string; isEnabled: boolean }> {
  const response = await apiFetchWithTimeout(
    `${API_BASE_URL}/plugins/${pluginId}/install`,
    {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isEnabled }),
    },
    TIMEOUT_MS,
  );

  if (!response.ok) {
    const message = await toApiErrorMessage(response);
    throw new Error(`Failed to update plugin: ${message}`);
  }

  return response.json();
}
