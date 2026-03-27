export type MobileAppStage = "boot" | "login" | "profilePicker" | "display"

interface ResolveMobileAppStageInput {
  isLoading: boolean
  isAuthenticated: boolean
  selectedProfileId: string | null
}

export function resolveMobileAppStage({
  isLoading,
  isAuthenticated,
  selectedProfileId,
}: ResolveMobileAppStageInput): MobileAppStage {
  if (isLoading) {
    return "boot"
  }

  if (!isAuthenticated) {
    return "login"
  }

  if (!selectedProfileId) {
    return "profilePicker"
  }

  return "display"
}

export function isMobileAdminReachableInNormalFlow(): boolean {
  return false
}
