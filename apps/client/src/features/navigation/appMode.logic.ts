export type AppMode = "admin" | "display" | "remoteControl" | "marketplace" | "integrations";

export function getInitialAppMode(): AppMode {
  return "admin";
}

export function enterDisplayMode(): AppMode {
  return "display";
}

export function enterRemoteControlMode(): AppMode {
  return "remoteControl";
}

export function exitDisplayMode(): AppMode {
  return "admin";
}

export function exitRemoteControlMode(): AppMode {
  return "admin";
}

export function enterMarketplaceMode(): AppMode {
  return "marketplace";
}

export function exitMarketplaceMode(): AppMode {
  return "admin";
}

export function enterIntegrationsMode(): AppMode {
  return "integrations";
}

export function exitIntegrationsMode(): AppMode {
  return "admin";
}
