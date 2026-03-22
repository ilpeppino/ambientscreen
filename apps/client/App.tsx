import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { AdminHomeScreen } from "./src/features/admin/screens/AdminHomeScreen";
import { AuthProvider, useAuth } from "./src/features/auth/auth.context";
import { LoginScreen } from "./src/features/auth/screens/LoginScreen";
import { DisplayScreen } from "./src/features/display/screens/DisplayScreen";
import { getCurrentDeviceMetadata } from "./src/features/devices/deviceMetadata";
import {
  DEVICE_STORAGE_KEY,
  registerOrHeartbeatDevice,
} from "./src/features/devices/deviceRegistration.logic";
import { heartbeatDevice, registerDevice } from "./src/services/api/devicesApi";
import {
  enterDisplayMode,
  exitDisplayMode,
  getInitialAppMode,
  type AppMode,
} from "./src/features/navigation/appMode.logic";

function AuthenticatedApp() {
  const { isLoading, token, logout } = useAuth();
  const [mode, setMode] = useState<AppMode>(getInitialAppMode);
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

  if (mode === "admin") {
    return (
      <AdminHomeScreen
        currentDeviceId={deviceId}
        onEnterDisplayMode={() => setMode(enterDisplayMode())}
        onLogout={() => {
          void logout();
        }}
      />
    );
  }

  return <DisplayScreen deviceId={deviceId} onExitDisplayMode={() => setMode(exitDisplayMode())} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
