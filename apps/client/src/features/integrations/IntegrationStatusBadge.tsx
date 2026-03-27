import React from "react";
import { InlineStatusBadge, type InlineStatusTone } from "../../shared/ui/management";
import type { IntegrationStatus } from "../../services/api/integrationsApi";

const STATUS_CONFIG: Record<IntegrationStatus, { label: string; tone: InlineStatusTone }> = {
  connected: { label: "Connected", tone: "success" },
  needs_reauth: { label: "Needs reconnection", tone: "warning" },
  revoked: { label: "Disconnected", tone: "danger" },
  error: { label: "Error", tone: "danger" },
};

interface IntegrationStatusBadgeProps {
  status: string;
}

export function IntegrationStatusBadge({ status }: IntegrationStatusBadgeProps) {
  const config = STATUS_CONFIG[status as IntegrationStatus] ?? { label: status, tone: "neutral" as const };
  return <InlineStatusBadge label={config.label} tone={config.tone} />;
}
