import assert from "node:assert/strict";
import test from "node:test";
import { resolveApiBaseUrl } from "../src/core/config/api-base-url";

test("M0-4: resolveApiBaseUrl uses EXPO_PUBLIC_API_BASE_URL when provided", () => {
  const apiBaseUrl = resolveApiBaseUrl({
    envApiBaseUrl: "http://192.168.1.44:3000/ ",
    platform: "web"
  });

  assert.equal(apiBaseUrl, "http://192.168.1.44:3000");
});

test("M0-4: resolveApiBaseUrl defaults to localhost on web", () => {
  const apiBaseUrl = resolveApiBaseUrl({
    platform: "web"
  });

  assert.equal(apiBaseUrl, "http://localhost:3000");
});

test("M0-4: resolveApiBaseUrl prefers Metro host on native when script URL exists", () => {
  const apiBaseUrl = resolveApiBaseUrl({
    platform: "ios",
    scriptUrl: "http://192.168.0.25:8081/index.bundle?platform=ios"
  });

  assert.equal(apiBaseUrl, "http://192.168.0.25:3000");
});

test("M0-4: resolveApiBaseUrl falls back to 10.0.2.2 on android emulator", () => {
  const apiBaseUrl = resolveApiBaseUrl({
    platform: "android",
    scriptUrl: "not-a-valid-url"
  });

  assert.equal(apiBaseUrl, "http://10.0.2.2:3000");
});
