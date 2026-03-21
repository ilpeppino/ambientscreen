import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";
import { createDisplayKeepAwakeLifecycle } from "./keepAwake.lifecycle";

const lifecycle = createDisplayKeepAwakeLifecycle(
  {
    activate: (tag) => activateKeepAwakeAsync(tag),
    deactivate: (tag) => deactivateKeepAwake(tag),
  },
  {
    warn: (message, error) => {
      console.warn(message, error);
    },
  },
);

export function enableDisplayKeepAwake(): void {
  lifecycle.enable();
}

export function disableDisplayKeepAwake(): void {
  lifecycle.disable();
}
