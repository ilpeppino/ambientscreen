import { z } from "zod";

export const googleTokenResponseSchema = z.object({
  access_token: z.string(),
  expires_in: z.number(),
  scope: z.string().optional(),
  token_type: z.string(),
  refresh_token: z.string().optional(),
  id_token: z.string().optional(),
});

export const googleUserInfoSchema = z.object({
  id: z.string(),
  email: z.string().optional(),
  name: z.string().optional(),
  picture: z.string().optional(),
});

export const googleCalendarListResponseSchema = z.object({
  items: z
    .array(
      z.object({
        id: z.string(),
        summary: z.string().optional(),
        primary: z.boolean().optional(),
        accessRole: z.string().optional(),
      }),
    )
    .optional(),
});

export const googleTaskListsResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      updated: z.string().optional(),
    }),
  ).optional(),
});

export const googleTasksResponseSchema = z.object({
  items: z.array(
    z.object({
      id: z.string(),
      title: z.string().optional(),
      status: z.string().optional(),
      due: z.string().optional(),
      updated: z.string().optional(),
      deleted: z.boolean().optional(),
      hidden: z.boolean().optional(),
    }),
  ).optional(),
});
