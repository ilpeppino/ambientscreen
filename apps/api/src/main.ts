import { createApp } from "./app";
import { getApiPort } from "./core/config/env";
import { loadEnvFromFile } from "./core/config/load-env";

async function main() {
  loadEnvFromFile();

  const app = createApp();
  const port = getApiPort();

  app.listen(port, () => {
    console.log(`🚀 API running on port ${port}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
