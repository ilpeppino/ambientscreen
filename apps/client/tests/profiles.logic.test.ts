import assert from "node:assert/strict";
import test from "node:test";
import { resolveActiveProfileId } from "../src/features/profiles/profiles.logic";

test("resolveActiveProfileId uses persisted id when it still exists", () => {
  const result = resolveActiveProfileId(
    [
      {
        id: "profile-home",
        userId: "user-1",
        name: "Home",
        isDefault: true,
        createdAt: "2026-03-21T10:00:00.000Z",
      },
      {
        id: "profile-work",
        userId: "user-1",
        name: "Work",
        isDefault: false,
        createdAt: "2026-03-21T10:05:00.000Z",
      },
    ],
    "profile-work",
  );

  assert.equal(result, "profile-work");
});

test("resolveActiveProfileId falls back to default profile when persisted id is missing", () => {
  const result = resolveActiveProfileId(
    [
      {
        id: "profile-home",
        userId: "user-1",
        name: "Home",
        isDefault: true,
        createdAt: "2026-03-21T10:00:00.000Z",
      },
      {
        id: "profile-work",
        userId: "user-1",
        name: "Work",
        isDefault: false,
        createdAt: "2026-03-21T10:05:00.000Z",
      },
    ],
    "profile-unknown",
  );

  assert.equal(result, "profile-home");
});

test("resolveActiveProfileId returns null for empty profile list", () => {
  const result = resolveActiveProfileId([], "profile-home");
  assert.equal(result, null);
});
