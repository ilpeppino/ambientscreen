import { useCallback, useEffect, useState } from "react";
import { Linking, Platform } from "react-native";
import {
  listIntegrationConnections,
  listGoogleTaskLists,
  getIntegrationProviderAuthorizationUrl,
} from "../../services/api/integrationsApi";
import { DEEP_LINK_SCHEME } from "../../features/navigation/deepLinks";
import type { TasksConfig, TasksInspectorContext } from "./inspector";

interface UseTasksInspectorContextOptions {
  provider: TasksConfig["provider"];
  connectionId: string | undefined;
  onChange: (patch: Record<string, unknown>) => void;
}

interface UseTasksInspectorContextResult extends TasksInspectorContext {
  taskListsLoading: boolean;
}

export function useTasksInspectorContext({
  provider,
  connectionId,
  onChange,
}: UseTasksInspectorContextOptions): UseTasksInspectorContextResult {
  const [connections, setConnections] = useState<Array<{ id: string; label: string }>>([]);
  const [taskLists, setTaskLists] = useState<Array<{ id: string; label: string }>>([]);
  const [taskListsLoading, setTaskListsLoading] = useState(false);

  useEffect(() => {
    void listIntegrationConnections("google")
      .then((items) =>
        setConnections(
          items.map((connection) => ({
            id: connection.id,
            label:
              connection.accountLabel
              ?? connection.accountEmail
              ?? connection.externalAccountId
              ?? connection.provider,
          })),
        ),
      )
      .catch(() => setConnections([]));
  }, []);

  const loadTaskLists = useCallback(() => {
    if (provider !== "google-tasks" || !connectionId) {
      setTaskLists([]);
      return;
    }

    setTaskListsLoading(true);
    void listGoogleTaskLists(connectionId)
      .then((items) =>
        setTaskLists(
          items.map((item) => ({
            id: item.id,
            label: item.title,
          })),
        ),
      )
      .catch(() => setTaskLists([]))
      .finally(() => setTaskListsLoading(false));
  }, [connectionId, provider]);

  useEffect(() => {
    loadTaskLists();
  }, [loadTaskLists]);

  const onConnect = useCallback(() => {
    const returnTo = Platform.OS !== "web"
      ? `${DEEP_LINK_SCHEME}://integrations`
      : undefined;

    void (async () => {
      try {
        const authorizationUrl = await getIntegrationProviderAuthorizationUrl("google", returnTo);
        await Linking.openURL(authorizationUrl);
      } catch {
        // Keep inspector usable if OAuth launch fails.
      }
    })();
  }, []);

  const onSelectConnection = useCallback(
    (id: string) => {
      onChange({ integrationConnectionId: id, selectedTaskListIds: [] });
    },
    [onChange],
  );

  const onSelectTaskLists = useCallback(
    (ids: string[]) => {
      onChange({ selectedTaskListIds: ids });
    },
    [onChange],
  );

  const handleChange = useCallback(
    (patch: Partial<TasksConfig>) => {
      onChange(patch as Record<string, unknown>);
    },
    [onChange],
  );

  return {
    connections,
    taskLists,
    taskListsLoading,
    onConnect,
    onSelectConnection,
    onSelectTaskLists,
    onChange: handleChange,
  };
}
