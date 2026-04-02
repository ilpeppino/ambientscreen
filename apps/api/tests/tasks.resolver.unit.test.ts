import { afterEach, describe, expect, test, vi } from "vitest";
import { integrationsRepository } from "../src/modules/integrations/integrations.repository";
import {
  resolveTasksWidgetData,
  resetTasksResolverCacheForTests,
} from "../src/modules/widgetData/resolvers/tasks.resolver";

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
  accountLabel: "Work",
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

function buildAdapterResult() {
  return {
    tasks: [
      { id: "t1", title: "Alpha", completed: false, dueDate: "2026-04-03T10:00:00.000Z", sourceListName: "Work" },
      { id: "t2", title: "Bravo", completed: false, sourceListName: "Home" },
      { id: "t3", title: "Charlie", completed: false, dueDate: "2026-04-02T10:00:00.000Z", sourceListName: "Work" },
    ],
    lists: [
      { id: "work", name: "Work" },
      { id: "home", name: "Home" },
    ],
  };
}

afterEach(() => {
  vi.clearAllMocks();
  resetTasksResolverCacheForTests();
});

describe("resolveTasksWidgetData", () => {
  test("returns ready data with normalized order from adapter", async () => {
    vi.mocked(integrationsRepository.findById).mockResolvedValue(baseConnection as never);

    const adapter = {
      validateConnection: vi.fn(async () => true),
      refreshConnectionIfNeeded: vi.fn(async () => baseConnection),
      fetch: vi.fn(async () => ({ raw: true })),
      normalize: vi.fn(async () => buildAdapterResult()),
      getTtlSeconds: vi.fn(() => 60),
    } as any;

    const result = await resolveTasksWidgetData({
      widgetInstanceId: "widget-1",
      userId: "user-1",
      widgetConfig: {
        provider: "google-tasks",
        integrationConnectionId: "conn-1",
        selectedTaskListIds: ["work", "home"],
        displayMode: "list",
        maxItems: 5,
      },
    }, adapter);

    expect(result.state).toBe("ready");
    expect(result.widgetKey).toBe("tasks");
    expect(result.data?.tasks.map((task) => task.id)).toEqual(["t1", "t2", "t3"]);
    expect(adapter.fetch).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ selectedTaskListIds: ["work", "home"], maxItems: 5 }),
    }));
  });

  test("returns all lists behavior when selectedTaskListIds is empty", async () => {
    vi.mocked(integrationsRepository.findById).mockResolvedValue(baseConnection as never);

    const adapter = {
      validateConnection: vi.fn(async () => true),
      refreshConnectionIfNeeded: vi.fn(async () => baseConnection),
      fetch: vi.fn(async () => ({ raw: true })),
      normalize: vi.fn(async () => ({ tasks: [], lists: [] })),
      getTtlSeconds: vi.fn(() => 60),
    } as any;

    await resolveTasksWidgetData({
      widgetInstanceId: "widget-1",
      userId: "user-1",
      widgetConfig: {
        provider: "google-tasks",
        integrationConnectionId: "conn-1",
        selectedTaskListIds: [],
        displayMode: "list",
      },
    }, adapter);

    expect(adapter.fetch).toHaveBeenCalledWith(expect.objectContaining({
      request: expect.objectContaining({ selectedTaskListIds: [] }),
    }));
  });

  test("returns stable error codes for missing connection and access denied", async () => {
    vi.mocked(integrationsRepository.findById).mockResolvedValue(null as never);

    const adapter = {
      validateConnection: vi.fn(async () => true),
      refreshConnectionIfNeeded: vi.fn(async () => baseConnection),
      fetch: vi.fn(),
      normalize: vi.fn(),
      getTtlSeconds: vi.fn(() => 60),
    } as any;

    const missing = await resolveTasksWidgetData({
      widgetInstanceId: "widget-1",
      userId: "user-1",
      widgetConfig: {
        provider: "google-tasks",
        integrationConnectionId: "conn-missing",
      },
    }, adapter);

    expect(missing.state).toBe("error");
    expect(missing.meta?.errorCode).toBe("CONNECTION_NOT_FOUND");

    vi.mocked(integrationsRepository.findById).mockResolvedValue({ ...baseConnection, userId: "user-2" } as never);

    const denied = await resolveTasksWidgetData({
      widgetInstanceId: "widget-1",
      userId: "user-1",
      widgetConfig: {
        provider: "google-tasks",
        integrationConnectionId: "conn-1",
      },
    }, adapter);

    expect(denied.state).toBe("error");
    expect(denied.meta?.errorCode).toBe("CONNECTION_ACCESS_DENIED");
  });

  test("cache key includes displayMode", async () => {
    vi.mocked(integrationsRepository.findById).mockResolvedValue(baseConnection as never);

    const adapter = {
      validateConnection: vi.fn(async () => true),
      refreshConnectionIfNeeded: vi.fn(async () => baseConnection),
      fetch: vi.fn(async () => ({ raw: true })),
      normalize: vi.fn(async () => ({ tasks: [], lists: [] })),
      getTtlSeconds: vi.fn(() => 120),
    } as any;

    await resolveTasksWidgetData({
      widgetInstanceId: "widget-1",
      userId: "user-1",
      widgetConfig: {
        provider: "google-tasks",
        integrationConnectionId: "conn-1",
        selectedTaskListIds: ["work"],
        displayMode: "list",
      },
    }, adapter);

    await resolveTasksWidgetData({
      widgetInstanceId: "widget-1",
      userId: "user-1",
      widgetConfig: {
        provider: "google-tasks",
        integrationConnectionId: "conn-1",
        selectedTaskListIds: ["work"],
        displayMode: "focus",
      },
    }, adapter);

    expect(adapter.fetch).toHaveBeenCalledTimes(2);
  });
});
