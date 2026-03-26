import { useCallback, useEffect, useState } from "react";
import {
  listIntegrationConnections,
  updateIntegrationConnection,
  deleteIntegrationConnection,
  refreshIntegrationConnection,
  type IntegrationConnection,
} from "../../services/api/integrationsApi";

export interface UseIntegrationsResult {
  connections: IntegrationConnection[];
  loading: boolean;
  error: string | null;
  reload: () => void;
  rename: (id: string, accountLabel: string | null) => Promise<void>;
  refresh: (id: string) => Promise<IntegrationConnection>;
  disconnect: (id: string) => Promise<void>;
}

export function useIntegrations(provider?: string): UseIntegrationsResult {
  const [connections, setConnections] = useState<IntegrationConnection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(() => {
    setLoading(true);
    setError(null);
    listIntegrationConnections(provider)
      .then(setConnections)
      .catch((err: unknown) => {
        setError(err instanceof Error ? err.message : "Failed to load connections");
      })
      .finally(() => setLoading(false));
  }, [provider]);

  useEffect(() => {
    load();
  }, [load]);

  const rename = useCallback(async (id: string, accountLabel: string | null): Promise<void> => {
    const updated = await updateIntegrationConnection(id, { accountLabel });
    setConnections((prev) => prev.map((c) => (c.id === id ? updated : c)));
  }, []);

  const refresh = useCallback(async (id: string): Promise<IntegrationConnection> => {
    const updated = await refreshIntegrationConnection(id);
    setConnections((prev) => prev.map((c) => (c.id === id ? updated : c)));
    return updated;
  }, []);

  const disconnect = useCallback(async (id: string): Promise<void> => {
    await deleteIntegrationConnection(id);
    setConnections((prev) => prev.filter((c) => c.id !== id));
  }, []);

  return { connections, loading, error, reload: load, rename, refresh, disconnect };
}
