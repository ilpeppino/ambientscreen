import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { SafeAreaProvider } from "react-native-safe-area-context";
import { AdminHomeScreen } from "./src/features/admin/screens/AdminHomeScreen";
import { AuthProvider, useAuth } from "./src/features/auth/auth.context";
import { LoginScreen } from "./src/features/auth/screens/LoginScreen";
import { DisplayScreen } from "./src/features/display/screens/DisplayScreen";
import { getCurrentDeviceMetadata } from "./src/features/devices/deviceMetadata";
import { RemoteControlScreen } from "./src/features/remoteControl/screens/RemoteControlScreen";
import { createRemoteCommandClient } from "./src/features/remoteControl/services/remoteCommandClient";
import { emitRemoteCommand } from "./src/features/remoteControl/services/remoteCommandBus";
import {
  DEVICE_STORAGE_KEY,
  registerOrHeartbeatDevice,
} from "./src/features/devices/deviceRegistration.logic";
import { heartbeatDevice, registerDevice } from "./src/services/api/devicesApi";
import {
  enterDisplayMode,
  enterMarketplaceMode,
  enterRemoteControlMode,
  exitDisplayMode,
  exitMarketplaceMode,
  exitRemoteControlMode,
  getInitialAppMode,
  type AppMode,
} from "./src/features/navigation/appMode.logic";
import { useDeepLinks } from "./src/features/navigation/useDeepLinks";
import { useWebHistory } from "./src/features/navigation/useWebHistory";
import { MarketplaceScreen } from "./src/features/marketplace/screens/MarketplaceScreen";
import { API_BASE_URL } from "./src/core/config/api";
import { EntitlementsProvider } from "./src/features/entitlements/entitlements.context";

function AuthenticatedApp() {
  const { isLoading, token, logout } = useAuth();
  const [mode, setMode] = useState<AppMode>(getInitialAppMode);

  const applyModeChange = React.useCallback((nextMode: AppMode) => {
    setMode((currentMode) => {
      if (currentMode !== nextMode) {
        console.info(`[nav] ${currentMode} → ${nextMode}`);
      }
      return nextMode;
    });
  }, []);

  useDeepLinks({
    onNavigate: applyModeChange,
    isAuthenticated: Boolean(token),
  });

  useWebHistory({
    mode,
    onNavigate: applyModeChange,
  });

  const [deviceId, setDeviceId] = useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    let heartbeatIntervalId: ReturnType<typeof setInterval> | null = null;

    async function setupDevice() {
      if (!token) {
        setDeviceId(null);
        return;
      }

      try {
        const resolvedDeviceId = await registerOrHeartbeatDevice({
          getStoredDeviceId: () => AsyncStorage.getItem(DEVICE_STORAGE_KEY),
          setStoredDeviceId: (nextDeviceId) => AsyncStorage.setItem(DEVICE_STORAGE_KEY, nextDeviceId),
          clearStoredDeviceId: () => AsyncStorage.removeItem(DEVICE_STORAGE_KEY),
          registerDevice,
          heartbeatDevice,
          getDeviceMetadata: getCurrentDeviceMetadata,
        });

        if (cancelled) {
          return;
        }

        setDeviceId(resolvedDeviceId);
        heartbeatIntervalId = setInterval(() => {
          void heartbeatDevice({ deviceId: resolvedDeviceId }).catch((error) => {
            console.error("Device heartbeat failed", error);
          });
        }, 5 * 60 * 1000);
      } catch (error) {
        if (!cancelled) {
          console.error("Failed to initialize device registration", error);
        }
      }
    }

    void setupDevice();

    return () => {
      cancelled = true;
      if (heartbeatIntervalId !== null) {
        clearInterval(heartbeatIntervalId);
      }
    };
  }, [token]);

  const remoteCommandClientRef = React.useRef(createRemoteCommandClient({
    apiBaseUrl: API_BASE_URL,
    onConnectionStateChange: () => undefined,
    onCommand: (command) => {
      emitRemoteCommand(command);
    },
  }));

  React.useEffect(() => {
    const client = remoteCommandClientRef.current;
    if (!token || !deviceId) {
      client.disconnect();
      return;
    }

    client.setDeviceId(deviceId);
    client.connect();

    return () => {
      client.disconnect();
    };
  }, [deviceId, token]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, alignItems: "center", justifyContent: "center", backgroundColor: "#000" }}>
        <ActivityIndicator size="large" color="#fff" />
      </View>
    );
  }

  if (!token) {
    return <LoginScreen />;
  }

  if (mode === "marketplace") {
    return <MarketplaceScreen onBack={() => applyModeChange(exitMarketplaceMode())} />;
  }

  if (mode === "admin") {
    return (
      <AdminHomeScreen
        currentDeviceId={deviceId}
        onEnterDisplayMode={() => applyModeChange(enterDisplayMode())}
        onEnterRemoteControlMode={() => applyModeChange(enterRemoteControlMode())}
        onEnterMarketplace={() => applyModeChange(enterMarketplaceMode())}
        onLogout={() => {
          void logout();
        }}
      />
    );
  }

  if (mode === "remoteControl") {
    return <RemoteControlScreen currentDeviceId={deviceId} onBack={() => applyModeChange(exitRemoteControlMode())} />;
  }

  return <DisplayScreen deviceId={deviceId} onExitDisplayMode={() => applyModeChange(exitDisplayMode())} />;
}

export default function App() {
  return (
    <SafeAreaProvider>
      <AuthProvider>
        <EntitlementsProvider>
          <AuthenticatedApp />
        </EntitlementsProvider>
      </AuthProvider>
    </SafeAreaProvider>
  );
}
