import type {
  InspectorDefinition,
  InspectorSectionDefinition,
  InspectorFieldDefinition,
  InspectorAction,
  Option,
} from "../../features/admin/inspector/inspector.types";

export type {
  InspectorDefinition,
  InspectorSectionDefinition,
  InspectorFieldDefinition,
  InspectorAction,
  Option,
};

export type TasksProvider = "google-tasks" | "microsoft-todo" | "todoist";
export type TasksDisplayMode = "list" | "compact" | "focus";

export interface TasksConfig {
  provider?: TasksProvider;
  integrationConnectionId?: string;
  selectedTaskListIds?: string[];
  displayMode?: TasksDisplayMode;
  maxItems?: number;
  showCompleted?: boolean;
}

export interface TasksInspectorContext {
  connections: Array<{ id: string; label: string }>;
  taskLists: Array<{ id: string; label: string }>;
  onConnect: () => void;
  onSelectConnection: (connectionId: string) => void;
  onSelectTaskLists: (taskListIds: string[]) => void;
  onChange: (patch: Partial<TasksConfig>) => void;
}

const PROVIDER_LABELS: Record<TasksProvider, string> = {
  "google-tasks": "Google Tasks",
  "microsoft-todo": "Microsoft To Do",
  todoist: "Todoist",
};

const DISPLAY_MODE_LABELS: Record<TasksDisplayMode, string> = {
  list: "List",
  compact: "Compact",
  focus: "Focus",
};

function formatListSelectionSummary(selectedLabels: string[], selectedCount: number): string {
  if (selectedCount <= 0) {
    return "All lists";
  }

  if (selectedLabels.length === 1 && selectedCount === 1) {
    return selectedLabels[0];
  }

  if (selectedLabels.length === 2 && selectedCount === 2) {
    return `${selectedLabels[0]}, ${selectedLabels[1]}`;
  }

  return `${selectedCount} lists selected`;
}

export function getInspectorDefinition(
  config: TasksConfig,
  context: TasksInspectorContext,
): InspectorDefinition {
  const provider = config.provider ?? "google-tasks";
  const connectionId = config.integrationConnectionId ?? "";
  const selectedTaskListIds = Array.isArray(config.selectedTaskListIds)
    ? config.selectedTaskListIds.filter((id): id is string => typeof id === "string" && id.trim().length > 0)
    : [];
  const displayMode = config.displayMode ?? "list";
  const maxItems = typeof config.maxItems === "number" && Number.isFinite(config.maxItems)
    ? Math.min(20, Math.max(1, Math.round(config.maxItems)))
    : 5;
  const showCompleted = config.showCompleted ?? false;

  const selectedConnection = context.connections.find((connection) => connection.id === connectionId);
  const selectedLabels = context.taskLists
    .filter((list) => selectedTaskListIds.includes(list.id))
    .map((list) => list.label);

  const providerRequiresGoogleConnection = provider === "google-tasks";

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
              { label: "Google Tasks", value: "google-tasks" },
              { label: "Microsoft To Do", value: "microsoft-todo" },
              { label: "Todoist", value: "todoist" },
            ],
            onChange: (value: TasksProvider) => context.onChange({
              provider: value,
              integrationConnectionId: "",
              selectedTaskListIds: [],
            }),
          },
          {
            id: "integrationConnectionId",
            label: "Connection",
            kind: "connectionPicker",
            value: providerRequiresGoogleConnection ? (connectionId || null) : null,
            displayValue: providerRequiresGoogleConnection
              ? (selectedConnection?.label ?? "Not connected")
              : "Not required",
            editable: true,
            options: context.connections.map((connection) => ({ label: connection.label, value: connection.id })),
            helperText: providerRequiresGoogleConnection
              ? "Connect a Google account to access task lists"
              : "Provider adapter not yet available",
            isDisabled: !providerRequiresGoogleConnection,
            onConnect: context.onConnect,
            onChange: (value: string) => context.onSelectConnection(value),
          },
        ],
      },
      {
        id: "resource",
        title: "Task Lists",
        fields: [
          {
            id: "selectedTaskListIds",
            label: "Lists",
            kind: "optionList",
            selectionMode: "multiple",
            value: selectedTaskListIds,
            displayValue: formatListSelectionSummary(selectedLabels, selectedTaskListIds.length),
            editable: true,
            options: context.taskLists.map((list) => ({ label: list.label, value: list.id })),
            helperText: "Select one or more lists. Leave empty to use all lists.",
            isDisabled: !providerRequiresGoogleConnection || !connectionId,
            onChange: (value: string[]) => context.onSelectTaskLists(value),
          },
        ],
      },
      {
        id: "display",
        title: "Display",
        fields: [
          {
            id: "displayMode",
            label: "Mode",
            kind: "segmented",
            value: displayMode,
            displayValue: DISPLAY_MODE_LABELS[displayMode],
            editable: true,
            options: [
              { label: "List", value: "list" },
              { label: "Compact", value: "compact" },
              { label: "Focus", value: "focus" },
            ],
            onChange: (value: TasksDisplayMode) => context.onChange({ displayMode: value }),
          },
          {
            id: "maxItems",
            label: "Max items",
            kind: "segmented",
            value: maxItems,
            displayValue: String(maxItems),
            editable: true,
            options: [
              { label: "3", value: 3 },
              { label: "5", value: 5 },
              { label: "10", value: 10 },
              { label: "15", value: 15 },
            ],
            onChange: (value: number) => context.onChange({ maxItems: value }),
          },
          {
            id: "showCompleted",
            label: "Show completed",
            kind: "boolean",
            value: showCompleted,
            displayValue: showCompleted ? "Yes" : "No",
            editable: true,
            onChange: (value: boolean) => context.onChange({ showCompleted: value }),
          },
        ],
      },
    ],
  };
}
