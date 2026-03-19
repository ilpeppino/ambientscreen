import { createApp } from "./app";

const PORT = 3000;

async function main() {
  const app = createApp();

  app.listen(PORT, () => {
    console.log(`🚀 API running on http://localhost:${PORT}`);
  });
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});