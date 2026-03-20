const fallbackApiBaseUrl = "http://localhost:3000";

export const API_BASE_URL =
  process.env.EXPO_PUBLIC_API_BASE_URL ?? fallbackApiBaseUrl;