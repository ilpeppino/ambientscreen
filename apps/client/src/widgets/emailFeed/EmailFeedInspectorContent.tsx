import React from "react";
import { InspectorRenderer } from "../../features/admin/inspector/InspectorRenderer";
import type { InspectorMode } from "../../features/admin/inspector/inspector.types";
import { getInspectorDefinition } from "./inspector";
import { useEmailFeedInspectorContext } from "./useEmailFeedInspectorContext";

interface EmailFeedInspectorContentProps {
  config: Record<string, unknown>;
  draft: Record<string, unknown>;
  mode: InspectorMode;
  onChange: (patch: Record<string, unknown>) => void;
  disabled?: boolean;
}

export function EmailFeedInspectorContent({
  config,
  draft,
  mode,
  onChange,
  disabled,
}: EmailFeedInspectorContentProps) {
  const activeConfig = mode === "edit" ? draft : config;

  const context = useEmailFeedInspectorContext({
    provider: activeConfig.provider as "gmail" | "outlook" | "imap" | "slack" | "teams" | undefined,
    connectionId: activeConfig.integrationConnectionId as string | undefined,
    onChange,
  });

  const definition = getInspectorDefinition(activeConfig, context);

  return (
    <InspectorRenderer
      definition={definition}
      mode={mode}
      resourcesLoading={context.labelsLoading}
      disabled={disabled}
    />
  );
}
