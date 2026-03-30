import type { Profile } from "@ambient/shared-contracts"
import React, { useState } from "react"
import { ActivityIndicator, Platform, View } from "react-native"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { GestureHandlerRootView } from "react-native-gesture-handler"
import { SafeAreaProvider } from "react-native-safe-area-context"
import { AdminEditorScreen } from "./src/features/admin/screens/AdminEditorScreen"
import { AuthProvider, useAuth } from "./src/features/auth/auth.context"
import { LoginScreen } from "./src/features/auth/screens/LoginScreen"
import { DisplayScreen } from "./src/features/display/screens/DisplayScreen"
import { getCurrentDeviceMetadata } from "./src/features/devices/deviceMetadata"
import { RemoteControlScreen } from "./src/features/remoteControl/screens/RemoteControlScreen"
import { createRemoteCommandClient } from "./src/features/remoteControl/services/remoteCommandClient"
import { emitRemoteCommand } from "./src/features/remoteControl/services/remoteCommandBus"
import {
  DEVICE_STORAGE_KEY,
  registerOrHeartbeatDevice,
} from "./src/features/devices/deviceRegistration.logic"
import { heartbeatDevice, registerDevice } from "./src/services/api/devicesApi"
import {
  enterDisplayMode,
  enterIntegrationsMode,
  enterMarketplaceMode,
  enterRemoteControlMode,
  exitDisplayMode,
  exitIntegrationsMode,
  exitMarketplaceMode,
  exitRemoteControlMode,
  getInitialAppMode,
  type AppMode,
} from "./src/features/navigation/appMode.logic"
import { useDeepLinks } from "./src/features/navigation/useDeepLinks"
import { useWebHistory } from "./src/features/navigation/useWebHistory"
import type { OAuthCallbackParams } from "./src/features/navigation/deepLinks"
import { MarketplaceScreen } from "./src/features/marketplace/screens/MarketplaceScreen"
import { IntegrationsScreen } from "./src/features/integrations/IntegrationsScreen"
import { API_BASE_URL } from "./src/core/config/api"
import { EntitlementsProvider } from "./src/features/entitlements/entitlements.context"
import { DevSettingsProvider } from "./src/core/devSettings/devSettings.context"
import { ProfilePickerScreen } from "./src/features/mobile/screens/ProfilePickerScreen"
import { MobileDisplayScreen } from "./src/features/mobile/screens/MobileDisplayScreen"
import { resolveMobileAppStage } from "./src/features/mobile/mobileAppShell.logic"

function WebAuthenticatedApp() {
  const { isLoading, token, logout } = useAuth()
  const [mode, setMode] = useState<AppMode>(getInitialAppMode)
  const [oauthCallback, setOauthCallback] = useState<OAuthCallbackParams | null>(null)

  const applyModeChange = React.useCallback(
    (nextMode: AppMode, oauthCallbackParam?: OAuthCallbackParams) => {
      setMode((currentMode) => {
        if (currentMode !== nextMode) {
          console.info(`[nav] ${currentMode} → ${nextMode}`)
        }
        return nextMode
      })
      // Always replace the pending callback so stale messages don't persist
      setOauthCallback(oauthCallbackParam ?? null)
    },
    [],
  )

  useDeepLinks({
    onNavigate: applyModeChange,
    isAuthenticated: Boolean(token),
  })

  useWebHistory({
    mode,
    onNavigate: applyModeChange,
  })

  const [deviceId, setDeviceId] = useState<string | null>(null)

  React.useEffect(() => {
    let cancelled = false
    let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null

    async function setupDevice() {
      if (!token) {
        setDeviceId(null)
        return
      }

      try {
        const resolvedDeviceId = await registerOrHeartbeatDevice({
          getStoredDeviceId: () => AsyncStorage.getItem(DEVICE_STORAGE_KEY),
          setStoredDeviceId: (nextDeviceId) => AsyncStorage.setItem(DEVICE_STORAGE_KEY, nextDeviceId),
          clearStoredDeviceId: () => AsyncStorage.removeItem(DEVICE_STORAGE_KEY),
          registerDevice,
          heartbeatDevice,
          getDeviceMetadata: getCurrentDeviceMetadata,
        })

        if (cancelled) {
          return
        }

        setDeviceId(resolvedDeviceId)
        heartbeatIntervalId = setInterval(() => {
          void heartbeatDevice({ deviceId: resolvedDeviceId }).catch((error) => {
            console.error("Device heartbeat failed", error)
          })
        }, 5 * 60 * 1000)
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to initialize device registration", error)
        }
      }
    }

    void setupDevice()

    return () => {
      cancelled = true
      if (heartbeatIntervalId !== null) {
        clearInterval(heartbeatIntervalId)
      }
    }
  }, [token])

  const remoteCommandClientRef = React.useRef(createRemoteCommandClient({
    apiBaseUrl: API_BASE_URL,
    onConnectionStateChange: () => undefined,
    onCommand: (command) => {
      emitRemoteCommand(command)
    },
  }))

  React.useEffect(() => {
    const client = remoteCommandClientRef.current
    if (!token || !deviceId) {
      client.disconnect()
      return
    }

    client.setDeviceId(deviceId)
    client.connect()

    return () => {
      client.disconnect()
    }
  }, [deviceId, token])

  if (isLoading) {
    return <LoadingScreen />
  }

  if (!token) {
    return <LoginScreen />
  }

  if (mode === "marketplace") {
    return <MarketplaceScreen onBack={() => applyModeChange(exitMarketplaceMode())} />
  }

  if (mode === "integrations") {
    return (
      <IntegrationsScreen
        onBack={() => applyModeChange(exitIntegrationsMode())}
        oauthCallback={oauthCallback}
      />
    )
  }

  if (mode === "admin") {
    const adminProps = {
      currentDeviceId: deviceId,
      onEnterDisplayMode: () => applyModeChange(enterDisplayMode()),
      onEnterRemoteControlMode: () => applyModeChange(enterRemoteControlMode()),
      onEnterMarketplace: () => applyModeChange(enterMarketplaceMode()),
      onEnterIntegrations: () => applyModeChange(enterIntegrationsMode()),
      onLogout: () => {
        void logout()
      },
    }

    return <AdminEditorScreen {...adminProps} />
  }

  if (mode === "remoteControl") {
    return <RemoteControlScreen currentDeviceId={deviceId} onBack={() => applyModeChange(exitRemoteControlMode())} />
  }

  return <DisplayScreen deviceId={deviceId} onExitDisplayMode={() => applyModeChange(exitDisplayMode())} />
}

function NativeAuthenticatedApp() {
  const { isLoading, token, logout } = useAuth()
  const [selectedProfile, setSelectedProfile] = useState<Profile | null>(null)

  React.useEffect(() => {
    if (!token) {
      setSelectedProfile(null)
    }
  }, [token])

  const stage = resolveMobileAppStage({
    isLoading,
    isAuthenticated: Boolean(token),
    selectedProfileId: selectedProfile?.id ?? null,
  })

  if (stage === "boot") {
    return <LoadingScreen />
  }

  if (stage === "login") {
    return <LoginScreen />
  }

  if (stage === "profilePicker") {
    return (
      <ProfilePickerScreen
        onSelectProfile={setSelectedProfile}
        onLogout={logout}
      />
    )
  }

  if (!selectedProfile) {
    return <LoadingScreen />
  }

  return (
    <MobileDisplayScreen
      profile={selectedProfile}
      onExit={() => {
        setSelectedProfile(null)
      }}
      onUnauthorized={logout}
    />
  )
}

function AuthenticatedApp() {
  if (Platform.OS === "web") {
    return <WebAuthenticatedApp />
  }

  return <NativeAuthenticatedApp />
}

function LoadingScreen() {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
      <ActivityIndicator size="large" color="#fff" />
    </View>
  )
}

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AuthProvider>
          <EntitlementsProvider>
            <DevSettingsProvider>
              <AuthenticatedApp />
            </DevSettingsProvider>
          </EntitlementsProvider>
        </AuthProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
