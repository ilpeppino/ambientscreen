import React from "react";
import type { Device } from "@ambient/shared-contracts";
import { Text } from "../../shared/ui/components";
import {
  InlineStatusBadge,
  ManagementCard,
} from "../../shared/ui/management";

interface DeviceCardProps {
  device: Device;
  selected?: boolean;
  isCurrentDevice?: boolean;
  onPress?: () => void;
  children?: React.ReactNode;
}

function formatPresence(device: Device): "online" | "offline" | "unknown" {
  const explicitStatus = device.connectionStatus;
  if (explicitStatus === "online") {
    return "online";
  }

  if (explicitStatus === "offline") {
    return "offline";
  }

  const lastSeenDate = new Date(device.lastSeenAt);
  if (Number.isNaN(lastSeenDate.getTime())) {
    return "unknown";
  }

  const isLikelyOnline = Date.now() - lastSeenDate.getTime() < 5 * 60 * 1000;
  return isLikelyOnline ? "online" : "offline";
}

function formatLastSeenAt(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "Unknown";
  }

  return date.toLocaleString();
}

export function DeviceCard({
  device,
  selected = false,
  isCurrentDevice = false,
  onPress,
  children,
}: DeviceCardProps) {
  const presence = formatPresence(device);

  return (
    <ManagementCard
      title={device.name}
      subtitle={`${device.platform} / ${device.deviceType}`}
      icon="grid"
      onPress={onPress}
      badges={(
        <>
          <InlineStatusBadge
            label={presence}
            tone={presence === "online" ? "success" : presence === "offline" ? "warning" : "neutral"}
            icon={presence === "online" ? "check" : "close"}
          />
          {isCurrentDevice ? <InlineStatusBadge label="This device" tone="info" icon="star" /> : null}
          {selected ? <InlineStatusBadge label="Selected" tone="info" icon="check" /> : null}
        </>
      )}
    >
      <Text variant="caption" color="textSecondary">
        Last seen: {formatLastSeenAt(device.lastSeenAt)}
      </Text>
      {children}
    </ManagementCard>
  );
}
