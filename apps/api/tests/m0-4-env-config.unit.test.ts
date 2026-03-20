import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { getApiPort } from "../src/core/config/env";
import { loadEnvFromFile } from "../src/core/config/load-env";

test("M0-4: getApiPort defaults to 3000 when PORT is missing", () => {
  assert.equal(getApiPort({}), 3000);
});

test("M0-4: getApiPort uses valid numeric PORT from env", () => {
  assert.equal(getApiPort({ PORT: "4100" }), 4100);
});

test("M0-4: getApiPort ignores invalid PORT values", () => {
  assert.equal(getApiPort({ PORT: "abc" }), 3000);
  assert.equal(getApiPort({ PORT: "-1" }), 3000);
  assert.equal(getApiPort({ PORT: "70000" }), 3000);
});

test("M0-4: loadEnvFromFile loads missing values and keeps pre-existing env", () => {
  const tmpDirectory = fs.mkdtempSync(path.join(os.tmpdir(), "ambient-env-test-"));
  const envPath = path.join(tmpDirectory, ".env");
  fs.writeFileSync(
    envPath,
    [
      "# sample",
      "PORT=4123",
      "DATABASE_URL=\"postgresql://ambient:ambient@localhost:5432/ambient_dev\""
    ].join("\n"),
    "utf8"
  );

  const originalPort = process.env.PORT;
  const originalDatabaseUrl = process.env.DATABASE_URL;

  try {
    delete process.env.PORT;
    process.env.DATABASE_URL = "postgresql://keep-existing";

    loadEnvFromFile(envPath);

    assert.equal(process.env.PORT, "4123");
    assert.equal(process.env.DATABASE_URL, "postgresql://keep-existing");
  } finally {
    if (originalPort === undefined) {
      delete process.env.PORT;
    } else {
      process.env.PORT = originalPort;
    }

    if (originalDatabaseUrl === undefined) {
      delete process.env.DATABASE_URL;
    } else {
      process.env.DATABASE_URL = originalDatabaseUrl;
    }

    fs.rmSync(tmpDirectory, { recursive: true, force: true });
  }
});
