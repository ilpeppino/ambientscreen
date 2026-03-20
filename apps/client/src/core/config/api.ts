import { NativeModules, Platform } from "react-native";

const API_PORT = 3000;

function getFallbackApiBaseUrl() {
  if (Platform.OS === "web") {
    return `http://localhost:${API_PORT}`;
  }

  const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;

  if (scriptURL) {
    try {
      const host = new URL(scriptURL).hostname;
      if (host) {
        return `http://${host}:${API_PORT}`;
      }
    } catch {
      // Keep fallback behavior below.
    }
  }

  if (Platform.OS === "android") {
    // Android emulator cannot reach host machine via localhost.
    return `http://10.0.2.2:${API_PORT}`;
  }

  return `http://localhost:${API_PORT}`;
}

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? getFallbackApiBaseUrl();
