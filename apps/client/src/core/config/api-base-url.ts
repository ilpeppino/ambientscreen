interface ResolveApiBaseUrlInput {
  envApiBaseUrl?: string | null;
  platform: "web" | "android" | "ios" | "windows" | "macos";
  scriptUrl?: string | null;
  apiPort?: number;
}

const DEFAULT_API_PORT = 3000;

function normalizeApiBaseUrl(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

function isLoopbackHost(host: string): boolean {
  return host === "localhost" || host === "127.0.0.1" || host === "::1";
}

export function resolveApiBaseUrl(input: ResolveApiBaseUrlInput): string {
  const apiPort = input.apiPort ?? DEFAULT_API_PORT;
  const envApiBaseUrl = input.envApiBaseUrl?.trim();

  if (envApiBaseUrl) {
    return normalizeApiBaseUrl(envApiBaseUrl);
  }

  if (input.platform === "web") {
    return `http://localhost:${apiPort}`;
  }

  const scriptUrl = input.scriptUrl?.trim();
  if (scriptUrl) {
    try {
      const host = new URL(scriptUrl).hostname;
      if (host) {
        if (input.platform === "android" && isLoopbackHost(host)) {
          return `http://10.0.2.2:${apiPort}`;
        }
        return `http://${host}:${apiPort}`;
      }
    } catch {
      // Ignore malformed script URL and continue to fallback.
    }
  }

  if (input.platform === "android") {
    return `http://10.0.2.2:${apiPort}`;
  }

  return `http://localhost:${apiPort}`;
}
