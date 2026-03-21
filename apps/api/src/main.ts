import { createServer } from "node:http";
import { createApp } from "./app";
import { getApiPort } from "./core/config/env";
import { loadEnvFromFile } from "./core/config/load-env";
import { createRealtimeServer } from "./modules/realtime/realtime.server";
import { configureRealtimeServer } from "./modules/realtime/realtime.runtime";
import { startSharedSessionScheduler, stopSharedSessionScheduler } from "./modules/sharedSessions/sharedSessions.runtime";

async function main() {
  loadEnvFromFile();

  const app = createApp();
  const httpServer = createServer(app);
  const realtimeServer = createRealtimeServer(httpServer);
  configureRealtimeServer(realtimeServer);
  startSharedSessionScheduler();
  const port = getApiPort();

  httpServer.listen(port, () => {
    console.log(`🚀 API running on port ${port}`);
  });

  const shutdown = async () => {
    stopSharedSessionScheduler();
    await realtimeServer.close();
    httpServer.close(() => undefined);
  };

  process.on("SIGINT", () => {
    void shutdown();
  });
  process.on("SIGTERM", () => {
    void shutdown();
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
