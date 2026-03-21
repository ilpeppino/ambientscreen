const ACTIVE_PROFILE_STORAGE_KEY = "ambient.activeProfileId";

let memoryProfileId: string | null = null;

function getWebStorage(): Storage | null {
  if (typeof globalThis === "undefined") {
    return null;
  }

  const maybeStorage = (globalThis as { localStorage?: Storage }).localStorage;
  return maybeStorage ?? null;
}

export async function loadPersistedActiveProfileId(): Promise<string | null> {
  const storage = getWebStorage();
  if (!storage) {
    return memoryProfileId;
  }

  return storage.getItem(ACTIVE_PROFILE_STORAGE_KEY);
}

export async function persistActiveProfileId(profileId: string): Promise<void> {
  memoryProfileId = profileId;
  const storage = getWebStorage();
  if (!storage) {
    return;
  }

  storage.setItem(ACTIVE_PROFILE_STORAGE_KEY, profileId);
}

export async function clearPersistedActiveProfileId(): Promise<void> {
  memoryProfileId = null;
  const storage = getWebStorage();
  if (!storage) {
    return;
  }

  storage.removeItem(ACTIVE_PROFILE_STORAGE_KEY);
}
