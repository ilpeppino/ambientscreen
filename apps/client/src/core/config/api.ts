import { NativeModules, Platform } from "react-native";
import { resolveApiBaseUrl } from "./api-base-url";

const scriptURL = NativeModules.SourceCode?.scriptURL as string | undefined;

export const API_BASE_URL = resolveApiBaseUrl({
  envApiBaseUrl: process.env.EXPO_PUBLIC_API_BASE_URL,
  platform: Platform.OS,
  scriptUrl: scriptURL
});
