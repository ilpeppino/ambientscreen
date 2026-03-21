import { test, expect } from "vitest";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { getApiPort } from "../src/core/config/env";
import { loadEnvFromFile } from "../src/core/config/load-env";

test("M0-4: getApiPort defaults to 3000 when PORT is missing", () => {
  expect(getApiPort({})).toBe(3000);
});

test("M0-4: getApiPort uses valid numeric PORT from env", () => {
  expect(getApiPort({ PORT: "4100" })).toBe(4100);
});

test("M0-4: getApiPort ignores invalid PORT values", () => {
  expect(getApiPort({ PORT: "abc" })).toBe(3000);
  expect(getApiPort({ PORT: "-1" })).toBe(3000);
  expect(getApiPort({ PORT: "70000" })).toBe(3000);
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

    expect(process.env.PORT).toBe("4123");
    expect(process.env.DATABASE_URL).toBe("postgresql://keep-existing");
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
