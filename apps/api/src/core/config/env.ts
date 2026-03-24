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
