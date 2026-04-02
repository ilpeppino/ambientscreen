import React from "react";
import { InspectorRenderer } from "../../features/admin/inspector/InspectorRenderer";
import type { InspectorMode } from "../../features/admin/inspector/inspector.types";
import { getInspectorDefinition } from "./inspector";
import { useTasksInspectorContext } from "./useTasksInspectorContext";

interface TasksInspectorContentProps {
  config: Record<string, unknown>;
  draft: Record<string, unknown>;
  mode: InspectorMode;
  onChange: (patch: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function TasksInspectorContent({
  config,
  draft,
  mode,
  onChange,
  disabled,
}: TasksInspectorContentProps) {
  const activeConfig = mode === "edit" ? draft : config;

  const context = useTasksInspectorContext({
    provider: activeConfig.provider as "google-tasks" | "microsoft-todo" | "todoist" | undefined,
    connectionId: activeConfig.integrationConnectionId as string | undefined,
    onChange,
  });

  const definition = getInspectorDefinition(activeConfig, context);

  return (
    <InspectorRenderer
      definition={definition}
      mode={mode}
      resourcesLoading={context.taskListsLoading}
      disabled={disabled}
    />
  );
}
