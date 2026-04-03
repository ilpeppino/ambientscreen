import { z } from "zod";
import { SUPPORTED_PROVIDERS, SUPPORTED_STATUSES } from "./integrations.types";

export const integrationConnectionIdSchema = z.string().uuid("integrationConnectionId must be a valid UUID");

export const listConnectionsQuerySchema = z.object({
  provider: z.enum(SUPPORTED_PROVIDERS as [string, ...string[]]).optional(),
  status: z.enum(SUPPORTED_STATUSES as [string, ...string[]]).optional(),
});

export const patchConnectionSchema = z.object({
  accountLabel: z
    .string()
    .trim()
    .max(120)
    .transform((v) => (v === "" ? null : v))
    .nullable()
    .optional(),
});

export const googleCalendarsQuerySchema = z.object({
  integrationConnectionId: integrationConnectionIdSchema,
});

export const googleTaskListsQuerySchema = z.object({
  integrationConnectionId: integrationConnectionIdSchema,
});

export const googleGmailLabelsQuerySchema = z.object({
  integrationConnectionId: integrationConnectionIdSchema,
});
