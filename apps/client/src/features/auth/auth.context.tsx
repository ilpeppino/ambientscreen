import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { login as loginRequest, register as registerRequest, type AuthUser } from "../../services/api/authApi";
import { setApiAuthToken } from "../../services/api/apiClient";

const AUTH_STORAGE_KEY = "ambient.auth.v1";

interface PersistedAuthState {
  token: string;
  user: AuthUser;
}

interface AuthContextValue {
  isLoading: boolean;
  token: string | null;
  user: AuthUser | null;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

async function persistAuthState(state: PersistedAuthState): Promise<void> {
  await AsyncStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(state));
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [isLoading, setIsLoading] = useState(true);
  const [token, setToken] = useState<string | null>(null);
  const [user, setUser] = useState<AuthUser | null>(null);

  useEffect(() => {
    async function hydrateAuthState() {
      try {
        const raw = await AsyncStorage.getItem(AUTH_STORAGE_KEY);
        if (!raw) {
          return;
        }

        const parsed = JSON.parse(raw) as PersistedAuthState;
        if (!parsed?.token || !parsed?.user?.id || !parsed?.user?.email) {
          return;
        }

        setToken(parsed.token);
        setUser(parsed.user);
        setApiAuthToken(parsed.token);
      } finally {
        setIsLoading(false);
      }
    }

    void hydrateAuthState();
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest({ email, password });
    setToken(result.token);
    setUser(result.user);
    setApiAuthToken(result.token);
    await persistAuthState({ token: result.token, user: result.user });
  }, []);

  const register = useCallback(async (email: string, password: string) => {
    await registerRequest({ email, password });
    await login(email, password);
  }, [login]);

  const logout = useCallback(async () => {
    setToken(null);
    setUser(null);
    setApiAuthToken(null);
    await AsyncStorage.removeItem(AUTH_STORAGE_KEY);
  }, []);

  const value = useMemo<AuthContextValue>(() => ({
    isLoading,
    token,
    user,
    login,
    register,
    logout,
  }), [isLoading, token, user, login, register, logout]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }

  return context;
}
