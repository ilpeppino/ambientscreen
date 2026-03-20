import { activateKeepAwakeAsync, deactivateKeepAwake } from "expo-keep-awake";

export async function enableDisplayKeepAwake(): Promise<void> {
  try {
    await activateKeepAwakeAsync("display-mode");
  } catch (error) {
    console.warn("Failed to enable keep awake", error);
  }
}

export function disableDisplayKeepAwake(): void {
  try {
    deactivateKeepAwake("display-mode");
  } catch (error) {
    console.warn("Failed to disable keep awake", error);
  }
}