export type AppMode = "admin" | "display" | "remoteControl";

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
