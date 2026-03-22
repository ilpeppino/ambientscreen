import { z } from "zod";
import { Prisma } from "@prisma/client";
import { apiErrors } from "../../core/http/api-error";
import { pluginPublishingRepository } from "./pluginPublishing.repository";

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const SEMVER_RE = /^\d+\.\d+\.\d+(-[a-zA-Z0-9.]+)?(\+[a-zA-Z0-9.]+)?$/;

const createPluginSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().min(1).max(500),
  category: z.string().min(1).max(50),
});

const updatePluginSchema = z.object({
  description: z.string().min(1).max(500).optional(),
});

const createVersionSchema = z.object({
  version: z.string().regex(SEMVER_RE, "version must be valid semver (e.g. 1.0.0)"),
  manifest: z
    .object({
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
    })
    .passthrough(),
  entryPoint: z.string().min(1),
  changelog: z.string().optional(),
});

// ---------------------------------------------------------------------------
// Service
// ---------------------------------------------------------------------------

export const pluginPublishingService = {
  async createPlugin(authorId: string, body: unknown) {
    const parsed = createPluginSchema.safeParse(body);
    if (!parsed.success) {
      throw apiErrors.validation("Invalid plugin payload", parsed.error.format());
    }

    const { name, description, category } = parsed.data;

    const existing = await pluginPublishingRepository.findByName(name);
    if (existing) {
      throw apiErrors.duplicate(`Plugin with name '${name}' already exists`);
    }

    return pluginPublishingRepository.create({ name, description, category, authorId });
  },

  async listMyPlugins(authorId: string) {
    return pluginPublishingRepository.findAllByAuthor(authorId);
  },

  async getMyPlugin(authorId: string, pluginId: string) {
    const plugin = await pluginPublishingRepository.findByIdAndAuthor(pluginId, authorId);
    if (!plugin) {
      throw apiErrors.notFound("Plugin not found");
    }
    return plugin;
  },

  async updatePlugin(authorId: string, pluginId: string, body: unknown) {
    const parsed = updatePluginSchema.safeParse(body);
    if (!parsed.success) {
      throw apiErrors.validation("Invalid update payload", parsed.error.format());
    }

    // Verify ownership
    const plugin = await pluginPublishingRepository.findById(pluginId);
    if (!plugin) {
      throw apiErrors.notFound("Plugin not found");
    }
    if (plugin.authorId !== authorId) {
      throw apiErrors.forbidden("You do not own this plugin");
    }

    return pluginPublishingRepository.update(pluginId, parsed.data);
  },

  async publishVersion(authorId: string, pluginId: string, body: unknown) {
    // Verify ownership
    const plugin = await pluginPublishingRepository.findById(pluginId);
    if (!plugin) {
      throw apiErrors.notFound("Plugin not found");
    }
    if (plugin.authorId !== authorId) {
      throw apiErrors.forbidden("You do not own this plugin");
    }

    const parsed = createVersionSchema.safeParse(body);
    if (!parsed.success) {
      throw apiErrors.validation("Invalid version payload", parsed.error.format());
    }

    const { version, manifest, entryPoint, changelog } = parsed.data;

    const existing = await pluginPublishingRepository.findVersionByPluginAndVersion(
      pluginId,
      version,
    );
    if (existing) {
      throw apiErrors.duplicate(`Version '${version}' already exists for this plugin`);
    }

    const created = await pluginPublishingRepository.createVersion({
      pluginId,
      version,
      manifestJson: manifest as Prisma.InputJsonValue,
      entryPoint,
      changelog,
    });

    // Activate the new version (deactivates previous active version)
    await pluginPublishingRepository.setActiveVersion(pluginId, created.id);

    return { ...created, isActive: true };
  },
};
