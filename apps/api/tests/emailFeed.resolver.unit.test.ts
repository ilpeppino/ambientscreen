import { afterEach, describe, expect, test, vi } from "vitest";
import { integrationsRepository } from "../src/modules/integrations/integrations.repository";
import {
  resetEmailFeedResolverCacheForTests,
  resolveEmailFeedWidgetData,
} from "../src/modules/widgetData/resolvers/emailFeed.resolver";

vi.mock("../src/modules/integrations/integrations.repository", () => ({
  integrationsRepository: {
    findById: vi.fn(),
  },
}));

const baseConnection = {
  id: "conn-1",
  userId: "user-1",
  provider: "google",
  status: "connected",
  accountLabel: "Work Gmail",
  externalAccountId: "google-1",
  scopesJson: "[]",
  accessTokenEncrypted: "enc",
  refreshTokenEncrypted: "enc-refresh",
  tokenExpiresAt: new Date(Date.now() + 60_000),
  metadataJson: "{}",
  lastSyncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

afterEach(() => {
  vi.clearAllMocks();
  resetEmailFeedResolverCacheForTests();
});

describe("resolveEmailFeedWidgetData", () => {
  test("maps Gmail metadata to normalized message model", async () => {
    vi.mocked(integrationsRepository.findById).mockResolvedValue(baseConnection as never);

    const adapter = {
      validateConnection: vi.fn(async () => true),
      refreshConnectionIfNeeded: vi.fn(async () => baseConnection),
      fetch: vi.fn(async () => ({ raw: true })),
      normalize: vi.fn(async () => ({
        unreadCount: 2,
        messages: [
          {
            id: "m1",
            title: "Subject A",
            sender: "Alice <alice@example.com>",
            timestamp: "2026-04-02T10:00:00.000Z",
            isUnread: true,
            preview: "Preview A",
            source: "Inbox",
          },
          {
            id: "m2",
            title: "Subject B",
            sender: "Bob <bob@example.com>",
            timestamp: "2026-04-02T09:00:00.000Z",
            isUnread: true,
            preview: "Preview B",
            source: "Inbox",
          },
        ],
      })),
      getTtlSeconds: vi.fn(() => 60),
    } as any;

    const result = await resolveEmailFeedWidgetData({
      widgetInstanceId: "widget-email",
      userId: "user-1",
      widgetConfig: {
        provider: "gmail",
        integrationConnectionId: "conn-1",
        label: "INBOX",
        onlyUnread: true,
        maxItems: 8,
      },
    }, adapter);

    expect(result.state).toBe("ready");
    expect(result.widgetKey).toBe("emailFeed");
    expect(result.data?.messages[0]).toEqual(expect.objectContaining({
      id: "m1",
      title: "Subject A",
      sender: "Alice <alice@example.com>",
      timestamp: "2026-04-02T10:00:00.000Z",
      isUnread: true,
      preview: "Preview A",
      source: "Inbox",
    }));
    expect(adapter.fetch).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ labelId: "INBOX", onlyUnread: true }),
    }));
  });

  test("passes unread and custom-label filters to adapter", async () => {
    vi.mocked(integrationsRepository.findById).mockResolvedValue(baseConnection as never);

    const adapter = {
      validateConnection: vi.fn(async () => true),
      refreshConnectionIfNeeded: vi.fn(async () => baseConnection),
      fetch: vi.fn(async () => ({ raw: true })),
      normalize: vi.fn(async () => ({ unreadCount: 0, messages: [] })),
      getTtlSeconds: vi.fn(() => 60),
    } as any;

    await resolveEmailFeedWidgetData({
      widgetInstanceId: "widget-email",
      userId: "user-1",
      widgetConfig: {
        provider: "gmail",
        integrationConnectionId: "conn-1",
        label: "CUSTOM",
        customLabel: "Label_42",
        onlyUnread: false,
        maxItems: 5,
      },
    }, adapter);

    expect(adapter.fetch).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ labelId: "Label_42", onlyUnread: false, maxItems: 5 }),
    }));
  });

  test("returns stable connection errors", async () => {
    vi.mocked(integrationsRepository.findById).mockResolvedValue(null as never);

    const adapter = {
      validateConnection: vi.fn(async () => true),
      refreshConnectionIfNeeded: vi.fn(async () => baseConnection),
      fetch: vi.fn(),
      normalize: vi.fn(),
      getTtlSeconds: vi.fn(() => 60),
    } as any;

    const missing = await resolveEmailFeedWidgetData({
      widgetInstanceId: "widget-email",
      userId: "user-1",
      widgetConfig: {
        provider: "gmail",
        integrationConnectionId: "conn-missing",
      },
    }, adapter);

    expect(missing.state).toBe("error");
    expect(missing.meta?.errorCode).toBe("CONNECTION_NOT_FOUND");

    vi.mocked(integrationsRepository.findById).mockResolvedValue({ ...baseConnection, userId: "user-2" } as never);

    const denied = await resolveEmailFeedWidgetData({
      widgetInstanceId: "widget-email",
      userId: "user-1",
      widgetConfig: {
        provider: "gmail",
        integrationConnectionId: "conn-1",
      },
    }, adapter);

    expect(denied.state).toBe("error");
    expect(denied.meta?.errorCode).toBe("CONNECTION_ACCESS_DENIED");
  });
});
