export type AppMode = "admin" | "display";

export function getInitialAppMode(): AppMode {
  return "admin";
}

export function enterDisplayMode(): AppMode {
  return "display";
}

export function exitDisplayMode(): AppMode {
  return "admin";
}
