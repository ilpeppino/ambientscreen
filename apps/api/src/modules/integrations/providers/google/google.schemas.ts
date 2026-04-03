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

export const googleGmailMessagesListSchema = z.object({
  resultSizeEstimate: z.number().optional(),
  messages: z.array(
    z.object({
      id: z.string(),
      threadId: z.string().optional(),
    }),
  ).optional(),
});

export const googleGmailMessageDetailSchema = z.object({
  id: z.string(),
  internalDate: z.string().optional(),
  labelIds: z.array(z.string()).optional(),
  snippet: z.string().optional(),
  payload: z.object({
    headers: z.array(
      z.object({
        name: z.string(),
        value: z.string(),
      }),
    ).optional(),
  }).optional(),
});

export const googleGmailLabelsSchema = z.object({
  labels: z.array(
    z.object({
      id: z.string(),
      name: z.string(),
      type: z.enum(["system", "user"]).optional(),
    }),
  ).optional(),
});
