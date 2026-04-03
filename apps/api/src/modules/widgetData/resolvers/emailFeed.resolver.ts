import type { EmailFeedWidgetData, WidgetConfigByKey, WidgetDataEnvelope } from "@ambient/shared-contracts";
import { integrationsRepository } from "../../integrations/integrations.repository";
import { googleGmailAdapter } from "../../integrations/providers/google/google-gmail.adapter";

type EmailProvider = NonNullable<WidgetConfigByKey["emailFeed"]["provider"]>;
type LabelPreset = NonNullable<WidgetConfigByKey["emailFeed"]["label"]>;

interface ResolveEmailFeedInput {
  widgetInstanceId: string;
  widgetConfig: unknown;
  userId?: string;
}

type GmailAdapter = typeof googleGmailAdapter;

const emailFeedCache = new Map<string, { expiresAt: number; data: EmailFeedWidgetData; fetchedAt: string }>();

function toEmailFeedConfig(config: unknown): Required<WidgetConfigByKey["emailFeed"]> {
  const raw = config && typeof config === "object" && !Array.isArray(config)
    ? config as Record<string, unknown>
    : {};

  const provider = raw.provider === "outlook"
    || raw.provider === "imap"
    || raw.provider === "slack"
    || raw.provider === "teams"
    || raw.provider === "gmail"
    ? raw.provider
    : "gmail";

  const label = raw.label === "IMPORTANT" || raw.label === "CUSTOM" || raw.label === "INBOX"
    ? raw.label
    : "INBOX";

  const parsedMaxItems = typeof raw.maxItems === "number" && Number.isFinite(raw.maxItems)
    ? Math.round(raw.maxItems)
    : 8;

  return {
    provider,
    integrationConnectionId: typeof raw.integrationConnectionId === "string" ? raw.integrationConnectionId : "",
    label,
    customLabel: typeof raw.customLabel === "string" ? raw.customLabel.trim() : "",
    onlyUnread: typeof raw.onlyUnread === "boolean" ? raw.onlyUnread : true,
    showPreview: typeof raw.showPreview === "boolean" ? raw.showPreview : false,
    maxItems: Math.min(20, Math.max(1, parsedMaxItems)),
  };
}

function buildEmptyData(provider: EmailProvider, label: string): EmailFeedWidgetData {
  return {
    provider,
    mailboxLabel: label,
    unreadCount: 0,
    messages: [],
  };
}

function unsupportedProviderResponse(
  input: ResolveEmailFeedInput,
  provider: EmailProvider,
): WidgetDataEnvelope<EmailFeedWidgetData, "emailFeed"> {
  return {
    widgetInstanceId: input.widgetInstanceId,
    widgetKey: "emailFeed",
    state: "error",
    data: null,
    meta: {
      source: provider,
      errorCode: "PROVIDER_FAILURE",
      message: "Selected provider is not yet supported.",
    },
  };
}

function resolveLabel(config: Required<WidgetConfigByKey["emailFeed"]>): {
  labelId: string;
  labelDisplay: string;
} {
  if (config.label === "IMPORTANT") {
    return { labelId: "IMPORTANT", labelDisplay: "Important" };
  }

  if (config.label === "CUSTOM") {
    const custom = config.customLabel.trim();
    if (custom.length > 0) {
      return { labelId: custom, labelDisplay: custom };
    }
  }

  return { labelId: "INBOX", labelDisplay: "Inbox" };
}

export async function resolveEmailFeedWidgetData(
  input: ResolveEmailFeedInput,
  adapter: GmailAdapter = googleGmailAdapter,
): Promise<WidgetDataEnvelope<EmailFeedWidgetData, "emailFeed">> {
  const config = toEmailFeedConfig(input.widgetConfig);

  if (config.provider !== "gmail") {
    return unsupportedProviderResponse(input, config.provider);
  }

  const { labelId, labelDisplay } = resolveLabel(config);

  if (!config.integrationConnectionId) {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "emailFeed",
      state: "empty",
      data: buildEmptyData(config.provider, labelDisplay),
      meta: {
        source: config.provider,
        errorCode: "CONNECTION_NOT_FOUND",
        message: "Select a Gmail connection to load messages.",
      },
    };
  }

  if (!input.userId) {
    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "emailFeed",
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
        widgetKey: "emailFeed",
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
        widgetKey: "emailFeed",
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
        widgetKey: "emailFeed",
        state: "error",
        data: null,
        meta: {
          source: config.provider,
          errorCode: "PROVIDER_FAILURE",
          message: "Connection provider does not match selected email provider.",
        },
      };
    }

    const isValid = await adapter.validateConnection(connection);
    if (!isValid) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "emailFeed",
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
      labelId,
      onlyUnread: config.onlyUnread,
      maxItems: config.maxItems,
      sourceLabel: labelDisplay,
    };

    const cacheKey = `${config.provider}|${config.integrationConnectionId}|${labelId}|${config.onlyUnread ? "1" : "0"}|${config.maxItems}`;
    const cached = emailFeedCache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return {
        widgetInstanceId: input.widgetInstanceId,
        widgetKey: "emailFeed",
        state: cached.data.messages.length > 0 ? "ready" : "empty",
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

    const responseData: EmailFeedWidgetData = {
      provider: config.provider,
      mailboxLabel: labelDisplay,
      unreadCount: normalized.unreadCount,
      messages: normalized.messages,
    };

    const fetchedAt = new Date().toISOString();
    const ttlMs = (adapter.getTtlSeconds?.({ connection: refreshedConnection, request }) ?? 45) * 1000;

    emailFeedCache.set(cacheKey, {
      expiresAt: Date.now() + ttlMs,
      data: responseData,
      fetchedAt,
    });

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "emailFeed",
      state: responseData.messages.length > 0 ? "ready" : "empty",
      data: responseData,
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
        widgetKey: "emailFeed",
        state: "error",
        data: null,
        meta: {
          source: config.provider,
          errorCode: "AUTH_REVOKED",
          message: "Authentication expired. Reconnect Gmail.",
        },
      };
    }

    return {
      widgetInstanceId: input.widgetInstanceId,
      widgetKey: "emailFeed",
      state: "stale",
      data: buildEmptyData(config.provider, labelDisplay),
      meta: {
        source: config.provider,
        errorCode: "PROVIDER_FAILURE",
        message: "Unable to fetch email feed from provider.",
      },
    };
  }
}

export function resetEmailFeedResolverCacheForTests() {
  emailFeedCache.clear();
}

export function resolveEmailFeedLabelPreset(label: LabelPreset, customLabel: string): string {
  if (label === "IMPORTANT") return "IMPORTANT";
  if (label === "CUSTOM" && customLabel.trim().length > 0) return customLabel.trim();
  return "INBOX";
}
