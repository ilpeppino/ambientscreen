import React from "react";
import { ManagementActionButton } from "../../../shared/ui/management";

interface InstallActionButtonProps {
  isInstalled: boolean;
  isPremiumLocked: boolean;
  isInstallationLocked: boolean;
  loading?: boolean;
  onInstall: () => void;
  onUninstall: () => void;
}

export function InstallActionButton({
  isInstalled,
  isPremiumLocked,
  isInstallationLocked,
  loading = false,
  onInstall,
  onUninstall,
}: InstallActionButtonProps) {
  if (isInstallationLocked || isPremiumLocked) {
    return null;
  }

  if (isInstalled) {
    return (
      <ManagementActionButton
        label="Uninstall"
        tone="destructive"
        icon="trash"
        loading={loading}
        onPress={onUninstall}
      />
    );
  }

  return (
    <ManagementActionButton
      label="Install"
      tone="primary"
      icon="plus"
      loading={loading}
      onPress={onInstall}
    />
  );
}
