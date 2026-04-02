import { getGoogleClientId, getGoogleClientSecret, getGoogleRedirectUri } from "../../../../core/config/env";
import {
  googleTokenResponseSchema,
  googleUserInfoSchema,
  googleCalendarListResponseSchema,
  googleTaskListsResponseSchema,
  googleTasksResponseSchema,
} from "./google.schemas";

export interface GoogleTokenSet {
  accessToken: string;
  refreshToken?: string;
  expiresAt: Date;
  scopes: string[];
}

export interface GoogleUserInfo {
  id: string;
  email?: string;
  name?: string;
  picture?: string;
}

export interface GoogleCalendarListItem {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string | null;
}

export interface GoogleTaskListItem {
  id: string;
  title: string;
  updatedAt?: string;
}

export interface GoogleTaskItem {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  updatedAt?: string;
}

export const googleClient = {
  buildAuthUrl(state: string): string {
    const scopes = [
      "openid",
      "email",
      "profile",
      "https://www.googleapis.com/auth/calendar.readonly",
      "https://www.googleapis.com/auth/tasks.readonly",
    ].join(" ");

    const params = new URLSearchParams({
      client_id: getGoogleClientId(),
      redirect_uri: getGoogleRedirectUri(),
      response_type: "code",
      scope: scopes,
      access_type: "offline",
      prompt: "consent",
      state,
    });
    return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
  },

  async exchangeCode(code: string): Promise<GoogleTokenSet> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        code,
        client_id: getGoogleClientId(),
        client_secret: getGoogleClientSecret(),
        redirect_uri: getGoogleRedirectUri(),
        grant_type: "authorization_code",
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`GOOGLE_TOKEN_EXCHANGE_FAILED:${response.status}`);
    }

    const raw = await response.json();
    const parsed = googleTokenResponseSchema.parse(raw);

    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token,
      expiresAt: new Date(Date.now() + parsed.expires_in * 1000),
      scopes: parsed.scope ? parsed.scope.split(" ") : [
        "openid",
        "email",
        "profile",
        "https://www.googleapis.com/auth/calendar.readonly",
        "https://www.googleapis.com/auth/tasks.readonly",
      ],
    };
  },

  async refreshAccessToken(refreshToken: string): Promise<GoogleTokenSet> {
    const response = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        refresh_token: refreshToken,
        client_id: getGoogleClientId(),
        client_secret: getGoogleClientSecret(),
        grant_type: "refresh_token",
      }).toString(),
    });

    if (!response.ok) {
      throw new Error(`GOOGLE_REFRESH_FAILED:${response.status}`);
    }

    const raw = await response.json();
    const parsed = googleTokenResponseSchema.parse(raw);

    return {
      accessToken: parsed.access_token,
      refreshToken: parsed.refresh_token ?? refreshToken,
      expiresAt: new Date(Date.now() + parsed.expires_in * 1000),
      scopes: parsed.scope ? parsed.scope.split(" ") : [],
    };
  },

  async fetchUserInfo(accessToken: string): Promise<GoogleUserInfo> {
    const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      throw new Error(`GOOGLE_USERINFO_FAILED:${response.status}`);
    }

    const raw = await response.json();
    return googleUserInfoSchema.parse(raw);
  },

  async fetchCalendarList(accessToken: string): Promise<GoogleCalendarListItem[]> {
    const response = await fetch("https://www.googleapis.com/calendar/v3/users/me/calendarList", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("GOOGLE_CALENDAR_UNAUTHORIZED");
      }
      throw new Error(`GOOGLE_CALENDAR_ERROR:${response.status}`);
    }

    const raw = await response.json();
    const parsed = googleCalendarListResponseSchema.parse(raw);

    return (parsed.items ?? []).map((item) => ({
      id: item.id,
      summary: item.summary ?? item.id,
      primary: item.primary ?? false,
      accessRole: item.accessRole ?? null,
    }));
  },

  async fetchTaskLists(accessToken: string): Promise<GoogleTaskListItem[]> {
    const response = await fetch("https://tasks.googleapis.com/tasks/v1/users/@me/lists", {
      headers: { Authorization: `Bearer ${accessToken}` },
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("GOOGLE_TASKS_UNAUTHORIZED");
      }
      throw new Error(`GOOGLE_TASKS_LISTS_ERROR:${response.status}`);
    }

    const raw = await response.json();
    const parsed = googleTaskListsResponseSchema.parse(raw);

    return (parsed.items ?? []).map((item) => ({
      id: item.id,
      title: item.title ?? item.id,
      updatedAt: item.updated,
    }));
  },

  async fetchTasksForList(accessToken: string, taskListId: string): Promise<GoogleTaskItem[]> {
    const params = new URLSearchParams({
      showCompleted: "true",
      showHidden: "false",
      showDeleted: "false",
      maxResults: "100",
    });

    const response = await fetch(
      `https://tasks.googleapis.com/tasks/v1/lists/${encodeURIComponent(taskListId)}/tasks?${params.toString()}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      },
    );

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error("GOOGLE_TASKS_UNAUTHORIZED");
      }
      throw new Error(`GOOGLE_TASKS_ITEMS_ERROR:${response.status}`);
    }

    const raw = await response.json();
    const parsed = googleTasksResponseSchema.parse(raw);

    return (parsed.items ?? [])
      .filter((item) => item.deleted !== true && item.hidden !== true)
      .map((item) => ({
        id: item.id,
        title: item.title?.trim() || "Untitled task",
        completed: item.status === "completed",
        dueDate: item.due,
        updatedAt: item.updated,
      }));
  },
};
