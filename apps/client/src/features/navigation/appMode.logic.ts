export type AppMode = "admin" | "display" | "remoteControl" | "marketplace";

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
