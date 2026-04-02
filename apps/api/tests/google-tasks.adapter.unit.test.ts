import { afterEach, expect, test, vi } from "vitest";

vi.mock("../src/core/crypto/encryption", () => ({
  decryptToken: vi.fn(() => "plain-access"),
}));

vi.mock("../src/modules/integrations/integrations.repository", () => ({
  integrationsRepository: {
    touchLastSynced: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock("../src/modules/integrations/providers/google/google.client", () => ({
  googleClient: {
    fetchTaskLists: vi.fn(),
    fetchTasksForList: vi.fn(),
    refreshAccessToken: vi.fn(),
  },
}));

import { integrationsRepository } from "../src/modules/integrations/integrations.repository";
import { googleClient } from "../src/modules/integrations/providers/google/google.client";
import { googleTasksAdapter } from "../src/modules/integrations/providers/google/google-tasks.adapter";

const connection = {
  id: "conn-1",
  userId: "user-1",
  provider: "google",
  status: "connected",
  accountLabel: null,
  externalAccountId: "google-uid",
  scopesJson: "[]",
  accessTokenEncrypted: "enc",
  refreshTokenEncrypted: "enc-refresh",
  tokenExpiresAt: new Date(Date.now() + 60 * 60 * 1000),
  metadataJson: "{}",
  lastSyncedAt: null,
  createdAt: new Date(),
  updatedAt: new Date(),
};

afterEach(() => {
  vi.clearAllMocks();
});

test("fetch returns selected lists only when selectedTaskListIds is set", async () => {
  vi.mocked(googleClient.fetchTaskLists).mockResolvedValue([
    { id: "work", title: "Work" },
    { id: "home", title: "Home" },
  ] as never);

  vi.mocked(googleClient.fetchTasksForList)
    .mockResolvedValueOnce([{ id: "a", title: "Task A", completed: false }] as never)
    .mockResolvedValueOnce([{ id: "b", title: "Task B", completed: false }] as never);

  const raw = await googleTasksAdapter.fetch({
    connection,
    request: {
      selectedTaskListIds: ["work"],
      showCompleted: false,
      maxItems: 5,
    },
  });

  expect(raw.lists.map((list) => list.id)).toEqual(["work", "home"]);
  expect(Object.keys(raw.tasksByList)).toEqual(["work"]);
  expect(googleClient.fetchTasksForList).toHaveBeenCalledTimes(1);
  expect(integrationsRepository.touchLastSynced).toHaveBeenCalledWith("conn-1", expect.any(Date));
});

test("normalize sorts due-date tasks first and truncates by maxItems", async () => {
  const normalized = await googleTasksAdapter.normalize({
    lists: [
      { id: "work", title: "Work" },
      { id: "home", title: "Home" },
    ],
    tasksByList: {
      work: [
        { id: "t1", title: "No due", completed: false, updatedAt: "2026-04-02T12:00:00.000Z" },
        { id: "t2", title: "Due soon", completed: false, dueDate: "2026-04-03T09:00:00.000Z" },
      ],
      home: [
        { id: "t3", title: "Due sooner", completed: false, dueDate: "2026-04-02T09:00:00.000Z" },
      ],
    },
  }, {
    connection,
    request: {
      selectedTaskListIds: [],
      showCompleted: false,
      maxItems: 2,
    },
  });

  expect(normalized.tasks.map((task) => task.id)).toEqual(["t3", "t2"]);
  expect(normalized.tasks.every((task) => task.completed === false)).toBe(true);
  expect(normalized.lists).toEqual([
    { id: "work", name: "Work" },
    { id: "home", name: "Home" },
  ]);
});
