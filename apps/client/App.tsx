import React, { useState } from "react";
import { ActivityIndicator, View } from "react-native";
import { AdminHomeScreen } from "./src/features/admin/screens/AdminHomeScreen";
import { AuthProvider, useAuth } from "./src/features/auth/auth.context";
import { LoginScreen } from "./src/features/auth/screens/LoginScreen";
import { DisplayScreen } from "./src/features/display/screens/DisplayScreen";
import {
  enterDisplayMode,
  exitDisplayMode,
  getInitialAppMode,
  type AppMode,
} from "./src/features/navigation/appMode.logic";

function AuthenticatedApp() {
  const { isLoading, token, logout } = useAuth();
  const [mode, setMode] = useState<AppMode>(getInitialAppMode);

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
        onEnterDisplayMode={() => setMode(enterDisplayMode())}
        onLogout={() => {
          void logout();
        }}
      />
    );
  }

  return <DisplayScreen onExitDisplayMode={() => setMode(exitDisplayMode())} />;
}

export default function App() {
  return (
    <AuthProvider>
      <AuthenticatedApp />
    </AuthProvider>
  );
}
