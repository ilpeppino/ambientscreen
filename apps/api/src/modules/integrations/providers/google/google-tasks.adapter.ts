import { decryptToken } from "../../../../core/crypto/encryption";
import { integrationsRepository } from "../../integrations.repository";
import type { IntegrationConnectionRecord } from "../../integrations.types";
import { googleCalendarAdapter } from "./google-calendar.adapter";
import { googleClient } from "./google.client";

export interface GoogleTasksFetchInput {
  selectedTaskListIds: string[];
  showCompleted: boolean;
  maxItems: number;
}

export interface NormalizedGoogleTask {
  id: string;
  title: string;
  completed: boolean;
  dueDate?: string;
  updatedAt?: string;
  sourceListName?: string;
}

export interface GoogleTasksNormalizedResult {
  tasks: NormalizedGoogleTask[];
  lists: Array<{ id: string; name: string }>;
}

export interface ProviderAdapter<TInput, TRaw, TNormalized> {
  providerKey: string;
  requiresConnection: boolean;
  validateConnection(connection: IntegrationConnectionRecord): Promise<boolean>;
  refreshConnectionIfNeeded(connection: IntegrationConnectionRecord): Promise<IntegrationConnectionRecord>;
  fetch(input: {
    connection: IntegrationConnectionRecord;
    request: TInput;
  }): Promise<TRaw>;
  normalize(raw: TRaw, input: {
    connection: IntegrationConnectionRecord;
    request: TInput;
  }): Promise<TNormalized>;
  getCacheKey?(input: {
    connection: IntegrationConnectionRecord;
    request: TInput;
  }): string;
  getTtlSeconds?(input: {
    connection: IntegrationConnectionRecord;
    request: TInput;
  }): number;
}

interface GoogleTasksRawResult {
  lists: Array<{ id: string; title: string }>;
  tasksByList: Record<string, Array<{
    id: string;
    title: string;
    completed: boolean;
    dueDate?: string;
    updatedAt?: string;
  }>>;
}

const DEFAULT_TTL_SECONDS = 60;

interface GoogleTasksAdapter extends ProviderAdapter<GoogleTasksFetchInput, GoogleTasksRawResult, GoogleTasksNormalizedResult> {
  fetchTaskLists(
    connection: IntegrationConnectionRecord,
    liveConnection?: IntegrationConnectionRecord,
  ): Promise<Array<{ id: string; title: string }>>;
}

export const googleTasksAdapter: GoogleTasksAdapter = {
  providerKey: "google-tasks",
  requiresConnection: true,

  async validateConnection(connection: IntegrationConnectionRecord): Promise<boolean> {
    return googleCalendarAdapter.validateConnection(connection);
  },

  async refreshConnectionIfNeeded(connection: IntegrationConnectionRecord): Promise<IntegrationConnectionRecord> {
    return googleCalendarAdapter.refreshConnectionIfNeeded(connection);
  },

  async fetch({ connection, request }): Promise<GoogleTasksRawResult> {
    const live = await this.refreshConnectionIfNeeded(connection);
    const accessToken = decryptToken(live.accessTokenEncrypted);
    const normalizedLists = await this.fetchTaskLists(connection, live);

    const selectedSet = request.selectedTaskListIds.length > 0
      ? new Set(request.selectedTaskListIds)
      : null;

    const activeLists = selectedSet
      ? normalizedLists.filter((list) => selectedSet.has(list.id))
      : normalizedLists;

    const tasksByListEntries = await Promise.all(
      activeLists.map(async (list) => {
        const tasks = await googleClient.fetchTasksForList(accessToken, list.id);
        return [list.id, tasks] as const;
      }),
    );

    await integrationsRepository.touchLastSynced(connection.id, new Date());

    return {
      lists: normalizedLists,
      tasksByList: Object.fromEntries(tasksByListEntries),
    };
  },

  async normalize(raw, { request }): Promise<GoogleTasksNormalizedResult> {
    const listNameById = new Map(raw.lists.map((list) => [list.id, list.title]));

    const merged = Object.entries(raw.tasksByList)
      .flatMap(([listId, tasks]) =>
        tasks.map((task) => ({
          ...task,
          sourceListName: listNameById.get(listId),
        })),
      )
      .filter((task) => request.showCompleted || !task.completed)
      .sort((left, right) => {
        const leftDue = parseIsoToTs(left.dueDate);
        const rightDue = parseIsoToTs(right.dueDate);

        if (leftDue !== null && rightDue !== null) {
          if (leftDue !== rightDue) return leftDue - rightDue;
        } else if (leftDue !== null) {
          return -1;
        } else if (rightDue !== null) {
          return 1;
        }

        const leftUpdated = parseIsoToTs(left.updatedAt) ?? 0;
        const rightUpdated = parseIsoToTs(right.updatedAt) ?? 0;
        if (leftUpdated !== rightUpdated) return rightUpdated - leftUpdated;

        return left.title.localeCompare(right.title);
      })
      .slice(0, request.maxItems)
      .map((task) => ({
        id: task.id,
        title: task.title,
        completed: task.completed,
        dueDate: task.dueDate,
        updatedAt: task.updatedAt,
        sourceListName: task.sourceListName,
      }));

    return {
      tasks: merged,
      lists: raw.lists.map((list) => ({ id: list.id, name: list.title })),
    };
  },

  getCacheKey({ connection, request }): string {
    const sortedListIds = [...request.selectedTaskListIds].sort();
    return [
      this.providerKey,
      connection.id,
      sortedListIds.join(","),
      String(request.maxItems),
      String(request.showCompleted),
    ].join("|");
  },

  getTtlSeconds(): number {
    return DEFAULT_TTL_SECONDS;
  },

  async fetchTaskLists(
    connection: IntegrationConnectionRecord,
    liveConnection?: IntegrationConnectionRecord,
  ): Promise<Array<{ id: string; title: string }>> {
    const live = liveConnection ?? await this.refreshConnectionIfNeeded(connection);
    const accessToken = decryptToken(live.accessTokenEncrypted);
    const taskLists = await googleClient.fetchTaskLists(accessToken);
    await integrationsRepository.touchLastSynced(connection.id, new Date());
    return taskLists.map((list) => ({ id: list.id, title: list.title }));
  },
};

function parseIsoToTs(value: string | undefined): number | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : parsed;
}
