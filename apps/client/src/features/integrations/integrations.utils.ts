import type { IntegrationConnection } from "../../services/api/integrationsApi";
import { getProviderPresentation } from "./integrations.providers";

/**
 * Client-side filter for integration connections.
 * Matches query against provider display label, account label, and account email.
 * Case-insensitive. Empty query returns all connections.
 */
export function filterConnections(
  connections: IntegrationConnection[],
  query: string,
): IntegrationConnection[] {
  const q = query.trim().toLowerCase();
  if (!q) return connections;
  return connections.filter((conn) => {
    const provider = getProviderPresentation(conn.provider);
    return (
      provider.label.toLowerCase().includes(q) ||
      (conn.accountLabel?.toLowerCase().includes(q) ?? false) ||
      (conn.accountEmail?.toLowerCase().includes(q) ?? false)
    );
  });
}
