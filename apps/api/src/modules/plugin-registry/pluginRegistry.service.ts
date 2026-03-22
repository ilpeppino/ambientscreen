import { z } from "zod";
import { Prisma } from "@prisma/client";
import { apiErrors } from "../../core/http/api-error";
import { pluginRegistryRepository } from "./pluginRegistry.repository";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;

const createPluginSchema = z.object({
  key: z.string().min(1).regex(/^[a-z][a-z0-9-]*$/, "key must be lowercase alphanumeric with hyphens"),
  name: z.string().min(1),
  description: z.string().min(1),
  category: z.string().min(1),
  isPremium: z.boolean().optional().default(false),
});

const createVersionSchema = z.object({
  version: z.string().regex(SEMVER_RE, "version must be valid semver (e.g. 1.0.0)"),
  manifestJson: z.object({
    key: z.string().min(1),
    version: z.string().min(1),
    name: z.string().min(1),
    description: z.string().min(1),
    category: z.string().min(1),
    defaultLayout: z.object({
      w: z.number(),
      h: z.number(),
    }),
    refreshPolicy: z.object({
      intervalMs: z.number().nullable(),
    }),
  }).passthrough(),
  changelog: z.string().optional(),
  setActive: z.boolean().optional().default(false),
});

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const pluginRegistryService = {
  listApproved() {
    return pluginRegistryRepository.findAllApproved();
  },

  async getByKey(key: string) {
    const plugin = await pluginRegistryRepository.findByKey(key);
    if (!plugin) {
      throw apiErrors.notFound(`Plugin '${key}' not found`);
    }
    return plugin;
  },

  async createPlugin(body: unknown) {
    const parsed = createPluginSchema.safeParse(body);
    if (!parsed.success) {
      throw apiErrors.validation("Invalid plugin payload", parsed.error.format());
    }

    const { key, name, description, category, isPremium } = parsed.data;

    const existing = await pluginRegistryRepository.findByKey(key);
    if (existing) {
      throw apiErrors.duplicate(`Plugin with key '${key}' already exists`);
    }

    return pluginRegistryRepository.create({ key, name, description, category, isPremium });
  },

  async createVersion(pluginId: string, body: unknown) {
    const plugin = await pluginRegistryRepository.findById(pluginId);
    if (!plugin) {
      throw apiErrors.notFound("Plugin not found");
    }

    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      throw apiErrors.validation("Invalid version payload", parsed.error.format());
    }

    const { version, manifestJson, changelog, setActive } = parsed.data;

    const existingVersion = await pluginRegistryRepository.findVersionByPluginAndVersion(pluginId, version);
    if (existingVersion) {
      throw apiErrors.duplicate(`Version '${version}' already exists for this plugin`);
    }

    const created = await pluginRegistryRepository.createVersion({
      pluginId,
      version,
      manifestJson: manifestJson as Prisma.InputJsonValue,
      changelog,
    });

    if (setActive) {
      await pluginRegistryRepository.setActiveVersion(pluginId, created.id);
      return { ...created, isActive: true };
    }

    return created;
  },

  async setApproval(pluginId: string, isApproved: boolean) {
    const updated = await pluginRegistryRepository.setApproved(pluginId, isApproved);
    if (!updated) {
      throw apiErrors.notFound("Plugin not found");
    }
    return updated;
  },
};
