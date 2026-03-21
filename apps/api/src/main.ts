import { createServer } from "node:http";
import { createApp } from "./app";
import { getApiPort } from "./core/config/env";
import { loadEnvFromFile } from "./core/config/load-env";
import { createRealtimeServer } from "./modules/realtime/realtime.server";
import { configureRealtimeServer } from "./modules/realtime/realtime.runtime";

async function main() {
  loadEnvFromFile();

  const app = createApp();
  const httpServer = createServer(app);
  const realtimeServer = createRealtimeServer(httpServer);
  configureRealtimeServer(realtimeServer);
  const port = getApiPort();

  httpServer.listen(port, () => {
    console.log(`🚀 API running on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
