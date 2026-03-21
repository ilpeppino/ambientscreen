import type { Profile } from "@ambient/shared-contracts";

export function resolveActiveProfileId(
  profiles: Profile[],
  persistedProfileId: string | null,
): string | null {
  if (profiles.length === 0) {
    return null;
  }

  if (persistedProfileId && profiles.some((profile) => profile.id === persistedProfileId)) {
    return persistedProfileId;
  }

  const defaultProfile = profiles.find((profile) => profile.isDefault);
  return defaultProfile?.id ?? profiles[0].id;
}
