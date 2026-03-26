import type { IntegrationConnectionRecord, IntegrationConnectionSummary, IntegrationConnectionMetadata } from "./integrations.types";

export function toSummary(record: IntegrationConnectionRecord): IntegrationConnectionSummary {
  let scopes: string[] = [];
  try {
    const parsed = JSON.parse(record.scopesJson);
    if (Array.isArray(parsed)) scopes = parsed;
  } catch {
    scopes = [];
  }

  let metadata: IntegrationConnectionMetadata = {};
  try {
    const parsed = JSON.parse(record.metadataJson);
    if (parsed && typeof parsed === "object") metadata = parsed as IntegrationConnectionMetadata;
  } catch {
    metadata = {};
  }

  return {
    id: record.id,
    provider: record.provider,
    status: record.status,
    accountLabel: record.accountLabel,
    accountEmail: metadata.email ?? null,
    externalAccountId: record.externalAccountId,
    scopes,
    lastSyncedAt: record.lastSyncedAt?.toISOString() ?? null,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}
