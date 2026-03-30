import React from "react";
import { describe, test, expect, vi, afterEach } from "vitest";

vi.mock("../src/core/config/api", () => ({
  API_BASE_URL: "http://localhost:3000",
}));

// Prevent lucide-react-native → react-native-svg parse error in the test env
vi.mock("../src/shared/ui/components/AppIcon", () => ({
  AppIcon: (props: Record<string, unknown>) =>
    React.createElement("mock-icon", props),
}));

// Avoid transitive svg import from IntegrationStatusBadge → InlineStatusBadge → AppIcon
vi.mock("../src/features/integrations/IntegrationStatusBadge", () => ({
  IntegrationStatusBadge: (props: Record<string, unknown>) =>
    React.createElement("mock-status-badge", props),
}));

import {
  tilePrimaryLabel,
  tileSecondaryLabel,
} from "../src/features/integrations/IntegrationConnectionTile";
import { filterConnections } from "../src/features/integrations/integrations.utils";
import type { IntegrationConnection } from "../src/services/api/integrationsApi";

afterEach(() => {
  vi.clearAllMocks();
});

const BASE_CONNECTION: IntegrationConnection = {
  id: "conn-abc",
  provider: "google",
  status: "connected",
  accountLabel: null,
  accountEmail: null,
  externalAccountId: null,
  scopes: [],
  lastSyncedAt: null,
  createdAt: "2026-01-01T00:00:00.000Z",
  updatedAt: "2026-01-01T00:00:00.000Z",
};

describe("tilePrimaryLabel", () => {
  test("prefers accountLabel when set", () => {
    const conn = { ...BASE_CONNECTION, accountLabel: "Work", accountEmail: "work@gmail.com" };
    expect(tilePrimaryLabel(conn)).toBe("Work");
  });

  test("falls back to accountEmail when no accountLabel", () => {
    const conn = { ...BASE_CONNECTION, accountEmail: "work@gmail.com" };
    expect(tilePrimaryLabel(conn)).toBe("work@gmail.com");
  });

  test("falls back to externalAccountId when no label or email", () => {
    const conn = { ...BASE_CONNECTION, externalAccountId: "12345" };
    expect(tilePrimaryLabel(conn)).toBe("12345");
  });

  test("falls back to provider string as last resort", () => {
    expect(tilePrimaryLabel(BASE_CONNECTION)).toBe("google");
  });
});

describe("tileSecondaryLabel", () => {
  test("returns undefined when no email and no lastSyncedAt", () => {
    expect(tileSecondaryLabel(BASE_CONNECTION)).toBeUndefined();
  });

  test("shows email only when accountLabel is set alongside it", () => {
    const conn = {
      ...BASE_CONNECTION,
      accountLabel: "Work",
      accountEmail: "work@gmail.com",
    };
    const label = tileSecondaryLabel(conn);
    expect(label).toContain("work@gmail.com");
  });

  test("does not show email when there is no accountLabel (email is already the primary)", () => {
    const conn = { ...BASE_CONNECTION, accountEmail: "work@gmail.com" };
    const label = tileSecondaryLabel(conn);
    expect(label).toBeUndefined();
  });

  test("shows synced date when lastSyncedAt is set", () => {
    const conn = { ...BASE_CONNECTION, lastSyncedAt: "2026-03-20T10:00:00.000Z" };
    const label = tileSecondaryLabel(conn);
    expect(label).toMatch(/Synced/i);
  });

  test("combines email and synced date with separator", () => {
    const conn = {
      ...BASE_CONNECTION,
      accountLabel: "Work",
      accountEmail: "work@gmail.com",
      lastSyncedAt: "2026-03-20T10:00:00.000Z",
    };
    const label = tileSecondaryLabel(conn);
    expect(label).toContain("work@gmail.com");
    expect(label).toContain("·");
    expect(label).toMatch(/Synced/i);
  });
});

describe("CRUD action prop contract", () => {
  // Tile accepts the same callback signatures used by useIntegrations.
  // Full CRUD wiring is covered in integrationsHooks.test.ts and integrationsApi.test.ts.

  test("onRename callback receives id and nullable label", async () => {
    const onRename = vi.fn().mockResolvedValue(undefined);
    await onRename("conn-abc", "Personal");
    expect(onRename).toHaveBeenCalledWith("conn-abc", "Personal");

    await onRename("conn-abc", null);
    expect(onRename).toHaveBeenCalledWith("conn-abc", null);
  });

  test("onRefresh callback receives id and returns updated connection", async () => {
    const updated = { ...BASE_CONNECTION, lastSyncedAt: "2026-03-26T12:00:00.000Z" };
    const onRefresh = vi.fn().mockResolvedValue(updated);
    const result = await onRefresh("conn-abc");
    expect(onRefresh).toHaveBeenCalledWith("conn-abc");
    expect(result.lastSyncedAt).toBe("2026-03-26T12:00:00.000Z");
  });

  test("onDisconnect callback receives id", async () => {
    const onDisconnect = vi.fn().mockResolvedValue(undefined);
    await onDisconnect("conn-abc");
    expect(onDisconnect).toHaveBeenCalledWith("conn-abc");
  });
});

describe("tile does not depend on full-width rows", () => {
  test("tilePrimaryLabel works for any provider, not just google", () => {
    const microsoftConn = {
      ...BASE_CONNECTION,
      provider: "microsoft",
      accountEmail: "user@outlook.com",
    };
    expect(tilePrimaryLabel(microsoftConn)).toBe("user@outlook.com");
  });

  test("tileSecondaryLabel works for any provider", () => {
    const githubConn = {
      ...BASE_CONNECTION,
      provider: "github",
      accountLabel: "octocat",
      accountEmail: "octocat@github.com",
    };
    expect(tileSecondaryLabel(githubConn)).toContain("octocat@github.com");
  });
});

describe("single item and multiple items render correctly", () => {
  test("tilePrimaryLabel handles single connection correctly", () => {
    const single = { ...BASE_CONNECTION, accountEmail: "me@gmail.com" };
    expect(tilePrimaryLabel(single)).toBe("me@gmail.com");
  });

  test("tilePrimaryLabel handles multiple connections with different providers", () => {
    const conn1 = { ...BASE_CONNECTION, id: "c1", provider: "google", accountEmail: "g@gmail.com" };
    const conn2 = { ...BASE_CONNECTION, id: "c2", provider: "github", accountEmail: "g@github.com" };
    expect(tilePrimaryLabel(conn1)).toBe("g@gmail.com");
    expect(tilePrimaryLabel(conn2)).toBe("g@github.com");
    expect(tilePrimaryLabel(conn1)).not.toBe(tilePrimaryLabel(conn2));
  });
});

describe("filterConnections", () => {
  const GOOGLE_CONN: IntegrationConnection = {
    ...BASE_CONNECTION,
    id: "c1",
    provider: "google",
    accountLabel: "Work",
    accountEmail: "work@gmail.com",
  };
  const GITHUB_CONN: IntegrationConnection = {
    ...BASE_CONNECTION,
    id: "c2",
    provider: "github",
    accountLabel: null,
    accountEmail: "octocat@github.com",
    externalAccountId: "octocat",
  };

  test("empty query returns all connections", () => {
    const result = filterConnections([GOOGLE_CONN, GITHUB_CONN], "");
    expect(result).toHaveLength(2);
  });

  test("whitespace-only query returns all connections", () => {
    const result = filterConnections([GOOGLE_CONN, GITHUB_CONN], "   ");
    expect(result).toHaveLength(2);
  });

  test("searching by provider label (google) matches google connection", () => {
    const result = filterConnections([GOOGLE_CONN, GITHUB_CONN], "google");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  test("searching by provider label is case-insensitive", () => {
    const result = filterConnections([GOOGLE_CONN, GITHUB_CONN], "GOOGLE");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  test("searching by account label matches correctly", () => {
    const result = filterConnections([GOOGLE_CONN, GITHUB_CONN], "work");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  test("searching by account email matches correctly", () => {
    const result = filterConnections([GOOGLE_CONN, GITHUB_CONN], "octocat@github.com");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c2");
  });

  test("partial email match works", () => {
    const result = filterConnections([GOOGLE_CONN, GITHUB_CONN], "gmail");
    expect(result).toHaveLength(1);
    expect(result[0].id).toBe("c1");
  });

  test("query matching nothing returns empty array", () => {
    const result = filterConnections([GOOGLE_CONN, GITHUB_CONN], "microsoft");
    expect(result).toHaveLength(0);
  });

  test("clearing search (empty query) restores all items", () => {
    const filtered = filterConnections([GOOGLE_CONN, GITHUB_CONN], "google");
    expect(filtered).toHaveLength(1);
    const restored = filterConnections([GOOGLE_CONN, GITHUB_CONN], "");
    expect(restored).toHaveLength(2);
  });

  test("works with empty connections list", () => {
    const result = filterConnections([], "google");
    expect(result).toHaveLength(0);
  });

  test("grid layout does not depend on full-width rows — filter works for 1, many, and mixed providers", () => {
    const single = filterConnections([GOOGLE_CONN], "");
    expect(single).toHaveLength(1);

    const many = filterConnections([GOOGLE_CONN, GITHUB_CONN, { ...BASE_CONNECTION, id: "c3", provider: "microsoft", accountEmail: "me@outlook.com" }], "");
    expect(many).toHaveLength(3);

    const mixed = filterConnections([GOOGLE_CONN, GITHUB_CONN], "github");
    expect(mixed).toHaveLength(1);
    expect(mixed[0].provider).toBe("github");
  });
});
