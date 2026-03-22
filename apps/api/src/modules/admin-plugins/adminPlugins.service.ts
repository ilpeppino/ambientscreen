import { z } from "zod";
import { apiErrors } from "../../core/http/api-error";
import { adminPluginsRepository } from "./adminPlugins.repository";

const rejectSchema = z.object({
  reason: z.string().optional(),
});

const approveVersionSchema = z.object({
  makeActive: z.boolean().optional().default(true),
});

export const adminPluginsService = {
  listPending() {
    return adminPluginsRepository.findPending();
  },

  async approvePlugin(pluginId: string, adminId: string) {
    const updated = await adminPluginsRepository.approvePlugin(pluginId, adminId);
    if (!updated) {
      throw apiErrors.notFound("Plugin not found");
    }
    return updated;
  },

  async rejectPlugin(pluginId: string, adminId: string, body: unknown) {
    const parsed = rejectSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiErrors.validation("Invalid reject payload", parsed.error.format());
    }

    const updated = await adminPluginsRepository.rejectPlugin(pluginId, adminId);
    if (!updated) {
      throw apiErrors.notFound("Plugin not found");
    }
    return { ...updated, reason: parsed.data.reason ?? null };
  },

  async approveVersion(pluginId: string, versionId: string, adminId: string, body: unknown) {
    const parsed = approveVersionSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiErrors.validation("Invalid approve payload", parsed.error.format());
    }

    const version = await adminPluginsRepository.findVersionById(versionId);
    if (!version || version.pluginId !== pluginId) {
      throw apiErrors.notFound("Plugin version not found");
    }

    const updated = await adminPluginsRepository.approveVersion(
      versionId,
      adminId,
      parsed.data.makeActive,
    );
    if (!updated) {
      throw apiErrors.notFound("Plugin version not found");
    }
    return updated;
  },

  async rejectVersion(pluginId: string, versionId: string, adminId: string, body: unknown) {
    const parsed = rejectSchema.safeParse(body ?? {});
    if (!parsed.success) {
      throw apiErrors.validation("Invalid reject payload", parsed.error.format());
    }

    const version = await adminPluginsRepository.findVersionById(versionId);
    if (!version || version.pluginId !== pluginId) {
      throw apiErrors.notFound("Plugin version not found");
    }

    const updated = await adminPluginsRepository.rejectVersion(versionId, adminId);
    if (!updated) {
      throw apiErrors.notFound("Plugin version not found");
    }
    return { ...updated, reason: parsed.data.reason ?? null };
  },
};
