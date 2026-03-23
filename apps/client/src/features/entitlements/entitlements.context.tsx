import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import type { EntitlementsResponse, FeatureFlagKey, UserPlan } from "@ambient/shared-contracts";
import { getEntitlements } from "../../services/api/entitlementsApi";
import { useAuth } from "../auth/auth.context";

interface EntitlementsContextValue {
  plan: UserPlan;
  features: Record<FeatureFlagKey, boolean>;
  isLoading: boolean;
  hasFeature: (key: FeatureFlagKey) => boolean;
  refresh: () => Promise<void>;
}

const defaultFeatures: Record<FeatureFlagKey, boolean> = {
  premium_widgets: false,
  advanced_layouts: false,
  multi_device_control: false,
  plugin_installation: false,
};

const EntitlementsContext = createContext<EntitlementsContextValue | undefined>(undefined);

export function EntitlementsProvider({ children }: { children: React.ReactNode }) {
  const { token, isLoading: isAuthLoading } = useAuth();
  const [plan, setPlan] = useState<UserPlan>("free");
  const [features, setFeatures] = useState<Record<FeatureFlagKey, boolean>>(defaultFeatures);
  const [isLoading, setIsLoading] = useState(true);

  const fetchEntitlements = useCallback(async () => {
    try {
      setIsLoading(true);
      const data: EntitlementsResponse = await getEntitlements();
      setPlan(data.plan);
      setFeatures(data.features);
    } catch {
      // Fail safe: keep defaults (all features locked)
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!token) {
      setPlan("free");
      setFeatures(defaultFeatures);
      setIsLoading(false);
      return;
    }

    void fetchEntitlements();
  }, [fetchEntitlements, token, isAuthLoading]);

  const hasFeature = useCallback(
    (key: FeatureFlagKey): boolean => features[key] ?? false,
    [features],
  );

  const value = useMemo<EntitlementsContextValue>(
    () => ({ plan, features, isLoading, hasFeature, refresh: fetchEntitlements }),
    [plan, features, isLoading, hasFeature, fetchEntitlements],
  );

  return (
    <EntitlementsContext.Provider value={value}>{children}</EntitlementsContext.Provider>
  );
}

export function useEntitlements(): EntitlementsContextValue {
  const context = useContext(EntitlementsContext);
  if (!context) {
    throw new Error("useEntitlements must be used within EntitlementsProvider");
  }
  return context;
}
