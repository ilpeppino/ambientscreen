import React, { createContext, useCallback, useContext, useEffect, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export interface DevSettings {
  debugOverlayEnabled: boolean;
  showRegionBounds: boolean;
  showContentBounds: boolean;
  showGridLines: boolean;
}

interface DevSettingsContextValue {
  settings: DevSettings;
  update: (patch: Partial<DevSettings>) => void;
}

const STORAGE_KEY = "ambient.devSettings.v1";

const defaults: DevSettings = {
  debugOverlayEnabled: false,
  showRegionBounds: true,
  showContentBounds: true,
  showGridLines: true,
};

const DevSettingsContext = createContext<DevSettingsContextValue>({
  settings: defaults,
  update: () => undefined,
});

export function DevSettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<DevSettings>(defaults);

  useEffect(() => {
    void AsyncStorage.getItem(STORAGE_KEY).then((raw) => {
      if (!raw) return;
      try {
        const parsed = JSON.parse(raw) as Partial<DevSettings>;
        setSettings((prev) => ({ ...prev, ...parsed }));
      } catch {
        // ignore malformed storage
      }
    });
  }, []);

  const update = useCallback((patch: Partial<DevSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...patch };
      void AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(next));
      return next;
    });
  }, []);

  return (
    <DevSettingsContext.Provider value={{ settings, update }}>
      {children}
    </DevSettingsContext.Provider>
  );
}

export function useDevSettings(): DevSettingsContextValue {
  return useContext(DevSettingsContext);
}
