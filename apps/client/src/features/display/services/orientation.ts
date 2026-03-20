import { Platform } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";
import { createDisplayOrientationLifecycle } from "./orientation.lifecycle";

const lifecycle = createDisplayOrientationLifecycle(
  {
    lock: async () => {
      if (Platform.OS === "web") {
        return;
      }

      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    },
    unlock: async () => {
      if (Platform.OS === "web") {
        return;
      }

      await ScreenOrientation.unlockAsync();
    },
  },
  {
    warn: (message, error) => {
      console.warn(message, error);
    },
  },
);

export async function lockDisplayLandscape(): Promise<void> {
  lifecycle.enable();
}

export async function unlockDisplayOrientation(): Promise<void> {
  lifecycle.disable();
}
