import { apiErrors } from "../../core/http/api-error";
import {
  ALL_FEATURE_FLAG_KEYS,
  FEATURE_FLAGS,
  type FeatureFlagKey,
  type UserPlan,
} from "./feature-flags";

export interface EntitlementUser {
  plan: string;
}

function toUserPlan(plan: string): UserPlan {
  return plan === "pro" ? "pro" : "free";
}

/**
 * Returns true if the user's plan grants access to the given feature.
 */
export function hasFeature(user: EntitlementUser, featureKey: FeatureFlagKey): boolean {
  const flag = FEATURE_FLAGS[featureKey];
  if (!flag) return false;

  const userPlan = toUserPlan(user.plan);

  if (flag.requiredPlan === "free") return true;
  return userPlan === "pro";
}

/**
 * Throws a 403 Forbidden error if the user cannot access the given feature.
 * Use this as a guard in route handlers and service methods.
 */
export function assertFeatureAccess(user: EntitlementUser, featureKey: FeatureFlagKey): void {
  if (!hasFeature(user, featureKey)) {
    const flag = FEATURE_FLAGS[featureKey];
    throw apiErrors.forbidden(
      `This feature requires a Pro plan: ${flag?.name ?? featureKey}. Upgrade to unlock it.`,
    );
  }
}

/**
 * Returns the full feature map for a user: { featureKey: boolean }.
 */
export function resolveUserFeatures(user: EntitlementUser): Record<FeatureFlagKey, boolean> {
  return ALL_FEATURE_FLAG_KEYS.reduce(
    (acc, key) => {
      acc[key] = hasFeature(user, key);
      return acc;
    },
    {} as Record<FeatureFlagKey, boolean>,
  );
}
