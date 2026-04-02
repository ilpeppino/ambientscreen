export type IntegrationProvider = "google";
export type IntegrationStatus = "connected" | "needs_reauth" | "revoked" | "error";

export type IntegrationProviderAuthType = "oauth";

export interface IntegrationProviderDescriptor {
  key: IntegrationProvider;
  label: string;
  description: string;
  authType: IntegrationProviderAuthType;
}

export const SUPPORTED_PROVIDERS: IntegrationProvider[] = ["google"];
export const SUPPORTED_STATUSES: IntegrationStatus[] = ["connected", "needs_reauth", "revoked", "error"];
export const SUPPORTED_PROVIDER_DESCRIPTORS: IntegrationProviderDescriptor[] = [
  {
    key: "google",
    label: "Google",
    description: "Connect a Google account to access calendar and task resources.",
    authType: "oauth",
  },
];

export interface IntegrationConnectionRecord {
  id: string;
  userId: string;
  provider: string;
  status: string;
  accountLabel: string | null;
  externalAccountId: string;
  scopesJson: string;
  accessTokenEncrypted: string;
  refreshTokenEncrypted: string | null;
  tokenExpiresAt: Date | null;
  metadataJson: string;
  lastSyncedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface IntegrationConnectionMetadata {
  email?: string;
  name?: string;
  picture?: string;
}

export interface IntegrationConnectionSummary {
  id: string;
  provider: string;
  status: string;
  accountLabel: string | null;
  accountEmail: string | null;
  externalAccountId: string | null;
  scopes: string[];
  lastSyncedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface GoogleCalendarOption {
  id: string;
  summary: string;
  primary: boolean;
  accessRole: string | null;
}

export interface GoogleTaskListOption {
  id: string;
  title: string;
  updatedAt?: string;
}
