import { decryptToken } from "../../../../core/crypto/encryption";
import { integrationsRepository } from "../../integrations.repository";
import type { IntegrationConnectionRecord, GoogleGmailLabelOption } from "../../integrations.types";
import { googleCalendarAdapter } from "./google-calendar.adapter";
import { googleClient } from "./google.client";

export interface GoogleGmailFetchInput {
  labelId?: string;
  onlyUnread: boolean;
  maxItems: number;
  sourceLabel?: string;
}

interface GoogleGmailRawMessage {
  id: string;
  internalDate: string;
  labelIds: string[];
  snippet?: string;
  headers: Record<string, string>;
}

interface GoogleGmailRawResult {
  resultSizeEstimate: number;
  messages: GoogleGmailRawMessage[];
}

export interface NormalizedGoogleGmailMessage {
  id: string;
  title: string;
  sender: string;
  timestamp: string;
  isUnread: boolean;
  preview?: string;
  source?: string;
}

export interface GoogleGmailNormalizedResult {
  unreadCount: number;
  messages: NormalizedGoogleGmailMessage[];
}

const DEFAULT_TTL_SECONDS = 45;

interface ProviderAdapter<TInput, TRaw, TNormalized> {
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

interface GoogleGmailAdapter extends ProviderAdapter<GoogleGmailFetchInput, GoogleGmailRawResult, GoogleGmailNormalizedResult> {
  fetchLabels(
    connection: IntegrationConnectionRecord,
    liveConnection?: IntegrationConnectionRecord,
  ): Promise<GoogleGmailLabelOption[]>;
}

function normalizeSubject(value: string | undefined): string {
  const cleaned = value?.trim();
  return cleaned && cleaned.length > 0 ? cleaned : "(No subject)";
}

function normalizeSender(value: string | undefined): string {
  const from = value?.trim();
  if (!from) return "Unknown sender";

  const withName = from.match(/^\s*([^<]+)\s*<([^>]+)>\s*$/);
  if (withName) {
    const name = withName[1].trim().replace(/^"|"$/g, "");
    const email = withName[2].trim();
    return name.length > 0 ? `${name} <${email}>` : email;
  }

  return from;
}

function toIsoTimestamp(internalDate: string): string {
  const parsed = Number.parseInt(internalDate, 10);
  if (!Number.isFinite(parsed) || Number.isNaN(parsed)) {
    return new Date().toISOString();
  }
  return new Date(parsed).toISOString();
}

export const googleGmailAdapter: GoogleGmailAdapter = {
  providerKey: "gmail",
  requiresConnection: true,

  async validateConnection(connection: IntegrationConnectionRecord): Promise<boolean> {
    return googleCalendarAdapter.validateConnection(connection);
  },

  async refreshConnectionIfNeeded(connection: IntegrationConnectionRecord): Promise<IntegrationConnectionRecord> {
    return googleCalendarAdapter.refreshConnectionIfNeeded(connection);
  },

  async fetch({ connection, request }): Promise<GoogleGmailRawResult> {
    const live = await this.refreshConnectionIfNeeded(connection);
    const accessToken = decryptToken(live.accessTokenEncrypted);

    const list = await googleClient.fetchGmailMessages({
      accessToken,
      labelId: request.labelId,
      maxResults: request.maxItems,
      query: request.onlyUnread ? "is:unread" : undefined,
    });

    const detailMessages = await Promise.all(
      list.messages.map((item) => googleClient.fetchGmailMessageMetadata(accessToken, item.id)),
    );

    await integrationsRepository.touchLastSynced(connection.id, new Date());

    return {
      resultSizeEstimate: list.resultSizeEstimate,
      messages: detailMessages.map((message) => ({
        id: message.id,
        internalDate: message.internalDate,
        labelIds: message.labelIds,
        snippet: message.snippet,
        headers: message.headers,
      })),
    };
  },

  async normalize(raw, { request }): Promise<GoogleGmailNormalizedResult> {
    const messages = raw.messages
      .map((message) => {
        const isUnread = message.labelIds.includes("UNREAD");
        return {
          id: message.id,
          title: normalizeSubject(message.headers.subject),
          sender: normalizeSender(message.headers.from),
          timestamp: toIsoTimestamp(message.internalDate),
          isUnread,
          preview: message.snippet?.trim() || undefined,
          source: request.sourceLabel,
        };
      })
      .sort((left, right) => {
        const byTime = Date.parse(right.timestamp) - Date.parse(left.timestamp);
        if (byTime !== 0) return byTime;
        return left.id.localeCompare(right.id);
      })
      .slice(0, request.maxItems);

    const unreadCount = messages.filter((message) => message.isUnread).length;

    return {
      unreadCount,
      messages,
    };
  },

  getCacheKey({ connection, request }): string {
    return [
      this.providerKey,
      connection.id,
      request.labelId ?? "",
      request.onlyUnread ? "1" : "0",
      String(request.maxItems),
    ].join("|");
  },

  getTtlSeconds(): number {
    return DEFAULT_TTL_SECONDS;
  },

  async fetchLabels(
    connection: IntegrationConnectionRecord,
    liveConnection?: IntegrationConnectionRecord,
  ): Promise<GoogleGmailLabelOption[]> {
    const live = liveConnection ?? await this.refreshConnectionIfNeeded(connection);
    const accessToken = decryptToken(live.accessTokenEncrypted);
    const labels = await googleClient.fetchGmailLabels(accessToken);
    await integrationsRepository.touchLastSynced(connection.id, new Date());
    return labels
      .map((label) => ({
        id: label.id,
        name: label.name,
        type: label.type,
      }))
      .sort((left, right) => left.name.localeCompare(right.name));
  },
};
