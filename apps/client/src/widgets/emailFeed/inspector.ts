import type {
  InspectorAction,
  InspectorDefinition,
  InspectorFieldDefinition,
  InspectorSectionDefinition,
  Option,
} from "../../features/admin/inspector/inspector.types";

export type {
  InspectorAction,
  InspectorDefinition,
  InspectorFieldDefinition,
  InspectorSectionDefinition,
  Option,
};

export type EmailFeedProvider = "gmail" | "outlook" | "imap" | "slack" | "teams";
export type EmailFeedLabelPreset = "INBOX" | "IMPORTANT" | "CUSTOM";

export interface EmailFeedConfig {
  provider?: EmailFeedProvider;
  integrationConnectionId?: string;
  label?: EmailFeedLabelPreset;
  customLabel?: string;
  onlyUnread?: boolean;
  showPreview?: boolean;
  maxItems?: number;
}

export interface EmailFeedInspectorContext {
  connections: Array<{ id: string; label: string }>;
  labels: Array<{ id: string; label: string; type: "system" | "user" }>;
  labelsLoading: boolean;
  onConnect: () => void;
  onSelectConnection: (connectionId: string) => void;
  onChange: (patch: Partial<EmailFeedConfig>) => void;
}

const PROVIDER_LABELS: Record<EmailFeedProvider, string> = {
  gmail: "Gmail",
  outlook: "Outlook",
  imap: "IMAP",
  slack: "Slack",
  teams: "Teams",
};

const LABEL_DISPLAY: Record<Exclude<EmailFeedLabelPreset, "CUSTOM">, string> = {
  INBOX: "Inbox",
  IMPORTANT: "Important",
};

function selectedCustomLabelDisplay(config: EmailFeedConfig, context: EmailFeedInspectorContext): string {
  const customLabel = (config.customLabel ?? "").trim();
  if (customLabel.length === 0) return "Not selected";
  return context.labels.find((label) => label.id === customLabel)?.label ?? customLabel;
}

export function getInspectorDefinition(
  config: EmailFeedConfig,
  context: EmailFeedInspectorContext,
): InspectorDefinition {
  const provider = config.provider ?? "gmail";
  const connectionId = config.integrationConnectionId ?? "";
  const selectedConnection = context.connections.find((connection) => connection.id === connectionId);
  const label = config.label ?? "INBOX";
  const onlyUnread = config.onlyUnread ?? true;
  const showPreview = config.showPreview ?? false;
  const maxItems = typeof config.maxItems === "number" && Number.isFinite(config.maxItems)
    ? Math.min(20, Math.max(1, Math.round(config.maxItems)))
    : 8;

  const gmailOnly = provider === "gmail";
  const hasConnection = gmailOnly && connectionId.length > 0;

  return {
    sections: [
      {
        id: "connection",
        title: "Connection",
        fields: [
          {
            id: "provider",
            label: "Provider",
            kind: "segmented",
            value: provider,
            displayValue: PROVIDER_LABELS[provider],
            editable: true,
            options: [
              { label: "Gmail", value: "gmail" },
              { label: "Outlook", value: "outlook" },
              { label: "IMAP", value: "imap" },
              { label: "Slack", value: "slack" },
              { label: "Teams", value: "teams" },
            ],
            onChange: (value: EmailFeedProvider) => context.onChange({
              provider: value,
              integrationConnectionId: "",
              customLabel: "",
            }),
          },
          {
            id: "integrationConnectionId",
            label: "Account",
            kind: "connectionPicker",
            value: gmailOnly ? (connectionId || null) : null,
            displayValue: gmailOnly ? (selectedConnection?.label ?? "Not connected") : "Not required",
            editable: true,
            options: context.connections.map((connection) => ({ label: connection.label, value: connection.id })),
            helperText: gmailOnly
              ? "Connect a Google account to access Gmail"
              : "Provider adapter coming soon",
            isDisabled: !gmailOnly,
            onConnect: context.onConnect,
            onChange: (value: string) => context.onSelectConnection(value),
          },
        ],
      },
      {
        id: "resource",
        title: "Mailbox",
        fields: [
          {
            id: "label",
            label: "Mailbox",
            kind: "segmented",
            value: label,
            displayValue: label === "CUSTOM" ? "Custom" : LABEL_DISPLAY[label],
            editable: true,
            options: [
              { label: "Inbox", value: "INBOX" },
              { label: "Important", value: "IMPORTANT" },
              { label: "Custom", value: "CUSTOM" },
            ],
            isDisabled: !gmailOnly,
            onChange: (value: EmailFeedLabelPreset) => context.onChange({
              label: value,
              ...(value !== "CUSTOM" ? { customLabel: "" } : {}),
            }),
          },
          {
            id: "customLabel",
            label: "Custom label",
            kind: "resourcePicker",
            value: (config.customLabel ?? "") || null,
            displayValue: selectedCustomLabelDisplay(config, context),
            editable: true,
            options: context.labels
              .filter((item) => item.type === "user")
              .map((item) => ({ label: item.label, value: item.id })),
            helperText: "Select a Gmail label",
            isVisible: label === "CUSTOM",
            isDisabled: !gmailOnly || !hasConnection,
            onChange: (value: string) => context.onChange({ customLabel: value }),
          },
        ],
      },
      {
        id: "display",
        title: "Display",
        fields: [
          {
            id: "onlyUnread",
            label: "Unread only",
            kind: "boolean",
            value: onlyUnread,
            displayValue: onlyUnread ? "Yes" : "No",
            editable: true,
            onChange: (value: boolean) => context.onChange({ onlyUnread: value }),
          },
          {
            id: "showPreview",
            label: "Show preview",
            kind: "boolean",
            value: showPreview,
            displayValue: showPreview ? "Yes" : "No",
            editable: true,
            onChange: (value: boolean) => context.onChange({ showPreview: value }),
          },
          {
            id: "maxItems",
            label: "Max messages",
            kind: "segmented",
            value: maxItems,
            displayValue: String(maxItems),
            editable: true,
            options: [
              { label: "3", value: 3 },
              { label: "5", value: 5 },
              { label: "8", value: 8 },
              { label: "12", value: 12 },
            ],
            onChange: (value: number) => context.onChange({ maxItems: value }),
          },
        ],
      },
    ],
  };
}
