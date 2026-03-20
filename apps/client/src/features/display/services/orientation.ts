import { Platform } from "react-native";
import * as ScreenOrientation from "expo-screen-orientation";

export async function lockDisplayLandscape(): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      await ScreenOrientation.lockAsync(
        ScreenOrientation.OrientationLock.LANDSCAPE,
      );
    }
  } catch (error) {
    console.warn("Failed to lock landscape orientation", error);
  }
}

export async function unlockDisplayOrientation(): Promise<void> {
  try {
    if (Platform.OS !== "web") {
      await ScreenOrientation.unlockAsync();
    }
  } catch (error) {
    console.warn("Failed to unlock orientation", error);
  }
}