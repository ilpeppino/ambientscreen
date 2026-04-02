import type { TasksWidgetData, WidgetConfigByKey, WidgetDataEnvelope } from "@ambient/shared-contracts";
import { integrationsRepository } from "../../integrations/integrations.repository";
import { googleTasksAdapter } from "../../integrations/providers/google/google-tasks.adapter";

type TasksProvider = NonNullable<WidgetConfigByKey["tasks"]["provider"]>;

interface ResolveTasksWidgetDataInput {
  widgetInstanceId: string;
  widgetConfig: unknown;
  userId?: string;
}

type TasksAdapter = typeof googleTasksAdapter;

const tasksCache = new Map<string, { expiresAt: number; data: TasksWidgetData; fetchedAt: string }>();

function toTasksConfig(config: unknown): Required<WidgetConfigByKey["tasks"]> {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  const provider = raw.provider === "microsoft-todo" || raw.provider === "todoist" || raw.provider === "google-tasks"
    ? raw.provider
    : "google-tasks";

  const displayMode = raw.displayMode === "compact" || raw.displayMode === "focus" || raw.displayMode === "list"
    ? raw.displayMode
    : "list";

  const selectedTaskListIds = Array.isArray(raw.selectedTaskListIds)
    ? raw.selectedTaskListIds
      .filter((id): id is string => typeof id === "string")
      .map((id) => id.trim())
      .filter((id) => id.length > 0)
    : [];

  const parsedMaxItems = typeof raw.maxItems === "number" && Number.isFinite(raw.maxItems)
    ? Math.round(raw.maxItems)
    : 5;

  const maxItems = Math.min(20, Math.max(1, parsedMaxItems));

  return {
    provider,
    integrationConnectionId: typeof raw.integrationConnectionId === "string" ? raw.integrationConnectionId : "",
    selectedTaskListIds,
    displayMode,
    maxItems,
    showCompleted: typeof raw.showCompleted === "boolean" ? raw.showCompleted : false,
  };
}

function buildEmptyData(): TasksWidgetData {
  return { tasks: [], lists: [] };
}

function unsupportedProviderResponse(
  input: ResolveTasksWidgetDataInput,
  provider: TasksProvider,
): WidgetDataEnvelope<TasksWidgetData, "tasks"> {
  return {
    widgetInstanceId: input.widgetInstanceId,
    widgetKey: "tasks",
    state: "error",
    data: null,
    meta: {
      source: provider,
      errorCode: "PROVIDER_FAILURE",
      message: "Selected provider is not yet supported.",
    },
  };
}

export async function resolveTasksWidgetData(
  input: ResolveTasksWidgetDataInput,
  adapter: TasksAdapter = googleTasksAdapter,
): Promise<WidgetDataEnvelope<TasksWidgetData, "tasks">> {
  const config = toTasksConfig(input.widgetConfig);

  if (config.provider !== "google-tasks") {
    return unsupportedProviderResponse(input, config.provider);
  }

  if (!config.integrationConnectionId) {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "tasks",
      state: "empty",
      data: buildEmptyData(),
      meta: {
        source: config.provider,
        errorCode: "CONNECTION_NOT_FOUND",
        message: "Select a Google connection to load tasks.",
      },
    };
  }

  if (!input.userId) {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "tasks",
      state: "error",
      data: null,
      meta: {
        source: config.provider,
        errorCode: "CONNECTION_ACCESS_DENIED",
        message: "Unable to validate connection ownership.",
      },
    };
  }

  try {
    const connection = await integrationsRepository.findById(config.integrationConnectionId);

    if (!connection) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "tasks",
        state: "error",
        data: null,
        meta: {
          source: config.provider,
          errorCode: "CONNECTION_NOT_FOUND",
          message: "Integration connection was not found.",
        },
      };
    }

    if (connection.userId !== input.userId) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "tasks",
        state: "error",
        data: null,
        meta: {
          source: config.provider,
          errorCode: "CONNECTION_ACCESS_DENIED",
          message: "You do not have access to this integration connection.",
        },
      };
    }

    if (connection.provider !== "google") {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "tasks",
        state: "error",
        data: null,
        meta: {
          source: config.provider,
          errorCode: "PROVIDER_FAILURE",
          message: "Connection provider does not match selected tasks provider.",
        },
      };
    }

    const isValid = await adapter.validateConnection(connection);
    if (!isValid) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "tasks",
        state: "error",
        data: null,
        meta: {
          source: config.provider,
          errorCode: "AUTH_REVOKED",
          message: "Connection is no longer valid. Reconnect the integration.",
        },
      };
    }

    const request = {
      selectedTaskListIds: config.selectedTaskListIds,
      showCompleted: config.showCompleted,
      maxItems: config.maxItems,
    };

    const cacheKey = `${config.provider}|${config.integrationConnectionId}|${[...config.selectedTaskListIds].sort().join(",")}|${config.displayMode}`;
    const cached = tasksCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "tasks",
        state: cached.data.tasks.length > 0 ? "ready" : "empty",
        data: cached.data,
        meta: {
          source: config.provider,
          fetchedAt: cached.fetchedAt,
          fromCache: true,
        },
      };
    }

    const refreshedConnection = await adapter.refreshConnectionIfNeeded(connection);
    const raw = await adapter.fetch({ connection: refreshedConnection, request });
    const normalized = await adapter.normalize(raw, { connection: refreshedConnection, request });

    const fetchedAt = new Date().toISOString();
    const ttlMs = (adapter.getTtlSeconds?.({ connection: refreshedConnection, request }) ?? 60) * 1000;

    tasksCache.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      data: {
        tasks: normalized.tasks,
        lists: normalized.lists,
      },
      fetchedAt,
    });

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "tasks",
      state: normalized.tasks.length > 0 ? "ready" : "empty",
      data: {
        tasks: normalized.tasks,
        lists: normalized.lists,
      },
      meta: {
        source: config.provider,
        fetchedAt,
      },
    };
  } catch (error) {
    const message = (error as Error).message;
    if (message === "INTEGRATION_NEEDS_REAUTH") {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "tasks",
        state: "error",
        data: null,
        meta: {
          source: config.provider,
          errorCode: "AUTH_REVOKED",
          message: "Authentication expired. Reconnect Google Tasks.",
        },
      };
    }

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "tasks",
      state: "stale",
      data: buildEmptyData(),
      meta: {
        source: config.provider,
        errorCode: "PROVIDER_FAILURE",
        message: "Unable to fetch tasks from provider.",
      },
    };
  }
}

export function resetTasksResolverCacheForTests() {
  tasksCache.clear();
}
