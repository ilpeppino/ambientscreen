const DEFAULT_API_PORT = 3000;

function parsePort(rawPort: string | undefined): number | null {
  if (!rawPort) {
    return null;
  }

  const parsedPort = Number.parseInt(rawPort, 10);
  if (!Number.isInteger(parsedPort) || parsedPort <= 0 || parsedPort > 65535) {
    return null;
  }

  return parsedPort;
}

export function getApiPort(env: NodeJS.ProcessEnv = process.env): number {
  return parsePort(env.PORT) ?? DEFAULT_API_PORT;
}

export function getAuthJwtSecret(env: NodeJS.ProcessEnv = process.env): string {
  const secret = env.AUTH_JWT_SECRET?.trim();

  if (!secret) {
    throw new Error("Missing required env var AUTH_JWT_SECRET");
  }

  return secret;
}

export function getGoogleClientId(env: NodeJS.ProcessEnv = process.env): string {
  const val = env.GOOGLE_CLIENT_ID?.trim();
  if (!val) throw new Error("Missing required env var GOOGLE_CLIENT_ID");
  return val;
}

export function getGoogleClientSecret(env: NodeJS.ProcessEnv = process.env): string {
  const val = env.GOOGLE_CLIENT_SECRET?.trim();
  if (!val) throw new Error("Missing required env var GOOGLE_CLIENT_SECRET");
  return val;
}

export function getGoogleRedirectUri(env: NodeJS.ProcessEnv = process.env): string {
  const val = env.GOOGLE_REDIRECT_URI?.trim();
  if (!val) throw new Error("Missing required env var GOOGLE_REDIRECT_URI");
  return val;
}

export function getIntegrationEncryptionKey(env: NodeJS.ProcessEnv = process.env): string {
  const val = env.INTEGRATION_ENCRYPTION_KEY?.trim();
  if (!val) throw new Error("Missing required env var INTEGRATION_ENCRYPTION_KEY");
  return val;
}

export function getAppBaseUrl(env: NodeJS.ProcessEnv = process.env): string {
  return env.APP_BASE_URL?.trim() ?? "http://localhost:19006";
}
