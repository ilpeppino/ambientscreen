import type { RemoteCommand } from "@ambient/shared-contracts";

export type RemoteCommandListener = (command: RemoteCommand) => void;

const listeners = new Set<RemoteCommandListener>();

export function emitRemoteCommand(command: RemoteCommand) {
  listeners.forEach((listener) => {
    listener(command);
  });
}

export function subscribeRemoteCommands(listener: RemoteCommandListener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
