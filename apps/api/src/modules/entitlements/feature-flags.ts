export type UserPlan = "free" | "pro";

export type FeatureFlagKey =
  | "premium_widgets"
  | "advanced_layouts"
  | "multi_device_control"
  | "plugin_installation";

export interface FeatureFlag {
  key: FeatureFlagKey;
  name: string;
  description: string;
  requiredPlan: UserPlan;
}

/**
 * Centralized feature flag definitions.
 * Add new flags here — no other config required.
 *
 * BILLING HOOK: When integrating a real billing provider (Stripe, App Store,
 * Play Store), map subscription tiers to `UserPlan` values here.
 */
export const FEATURE_FLAGS: Record<FeatureFlagKey, FeatureFlag> = {
  premium_widgets: {
    key: "premium_widgets",
    name: "Premium Widgets",
    description: "Access to widgets marked as premium in their plugin manifest.",
    requiredPlan: "pro",
  },
  advanced_layouts: {
    key: "advanced_layouts",
    name: "Advanced Layouts",
    description: "Custom grid layouts beyond the default 12-column base.",
    requiredPlan: "pro",
  },
  multi_device_control: {
    key: "multi_device_control",
    name: "Multi-Device Control",
    description: "Control and sync multiple display devices simultaneously.",
    requiredPlan: "pro",
  },
  plugin_installation: {
    key: "plugin_installation",
    name: "Plugin Installation",
    description: "Install third-party widget plugins from external sources.",
    requiredPlan: "pro",
  },
};

export const ALL_FEATURE_FLAG_KEYS = Object.keys(FEATURE_FLAGS) as FeatureFlagKey[];
