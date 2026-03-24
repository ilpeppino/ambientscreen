import { widgetBuiltinDefinitions } from "@ambient/shared-contracts";
import type { WidgetKey } from "@ambient/shared-contracts";
import { z } from "zod";
import { apiErrors } from "../../core/http/api-error";
import { pluginInstallationRepository } from "./pluginInstallation.repository";
import { pluginRegistryRepository } from "../plugin-registry/pluginRegistry.repository";
import { widgetConfigRegistry } from "@ambient/shared-contracts";
import { getWidgetPlugin } from "../widgets/widgetPluginRegistry";

const updateInstallSchema = z.object({
  isEnabled: z.boolean(),
});

function isBuiltinWidgetKey(value: string): value is WidgetKey {
  return Object.hasOwn(widgetBuiltinDefinitions, value);
}

export const pluginInstallationService = {
  async listInstalledForUser(userId: string) {
    return pluginInstallationRepository.findAllForUser(userId);
  },

  async installPlugin(userId: string, pluginId: string) {
    const plugin = await pluginRegistryRepository.findById(pluginId);
    if (!plugin) {
      throw apiErrors.notFound("Plugin not found");
    }
    if (!plugin.isApproved) {
      throw apiErrors.forbidden("Plugin is not approved for installation");
    }

    const existing = await pluginInstallationRepository.findByUserAndPlugin(userId, pluginId);
    if (existing) {
      throw apiErrors.duplicate("Plugin is already installed");
    }

    return pluginInstallationRepository.create({ userId, pluginId });
  },

  async uninstallPlugin(userId: string, pluginId: string) {
    const deleted = await pluginInstallationRepository.delete(userId, pluginId);
    if (!deleted) {
      throw apiErrors.notFound("Installed plugin not found");
    }
    return deleted;
  },

  async updateInstallation(userId: string, pluginId: string, body: unknown) {
    const parsed = updateInstallSchema.safeParse(body);
    if (!parsed.success) {
      throw apiErrors.validation("Invalid payload", parsed.error.format());
    }

    const updated = await pluginInstallationRepository.updateEnabled(
      userId,
      pluginId,
      parsed.data.isEnabled,
    );
    if (!updated) {
      throw apiErrors.notFound("Installed plugin not found");
    }
    return updated;
  },

  async assertPluginInstalledAndEnabled(userId: string, pluginKey: string) {
    // Only enforce installation for plugins registered in the DB registry.
    // Builtin plugins (in-memory only) are available to all users by default.
    if (isBuiltinWidgetKey(pluginKey)) {
      const widgetPlugin = getWidgetPlugin(pluginKey);
      if (widgetPlugin) {
        return;
      }
    }

    const registryPlugin = await pluginRegistryRepository.findByKey(pluginKey);
    if (!registryPlugin) {
      // Not a marketplace plugin — no installation check required.
      return;
    }

    const installation = await pluginInstallationRepository.findByUserAndPluginKey(userId, pluginKey);
    if (!installation) {
      throw apiErrors.forbidden(`Plugin '${pluginKey}' is not installed`);
    }
    if (!installation.isEnabled) {
      throw apiErrors.forbidden(`Plugin '${pluginKey}' is disabled`);
    }
  },
};
