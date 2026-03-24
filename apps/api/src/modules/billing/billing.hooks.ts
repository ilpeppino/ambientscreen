/**
 * Billing Integration Hooks — Placeholder Module
 *
 * This module is intentionally minimal. It defines the interfaces and
 * integration points that a real billing provider (Stripe, App Store,
 * Play Store, etc.) will plug into when monetization is implemented.
 *
 * INTEGRATION GUIDE:
 *
 * 1. SUBSCRIPTION WEBHOOK HANDLER
 *    When a user subscribes or cancels via Stripe/App Store:
 *    - Call `onSubscriptionActivated(userId)` to upgrade to "pro"
 *    - Call `onSubscriptionCancelled(userId)` to downgrade to "free"
 *    Register a webhook route at POST /billing/webhook
 *
 * 2. BILLING PROVIDER SETUP
 *    - Install the provider SDK (e.g., `npm install stripe`)
 *    - Add billing env vars: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET
 *    - Initialize the client here and export it
 *
 * 3. CUSTOMER MANAGEMENT
 *    - Add `billingCustomerId String?` to the User schema
 *    - Map Stripe customer IDs to local user IDs on first checkout
 *
 * 4. PLAN MANAGEMENT
 *    - Call `usersService.updateUserPlan(userId, "pro")` after payment confirmed
 *    - Call `usersService.updateUserPlan(userId, "free")` on cancellation/expiry
 *
 * 5. ENTITLEMENT SYNC
 *    - The `plan` field on User drives all feature access (see entitlements.service.ts)
 *    - No additional sync is needed once the plan field is updated
 */

export type SubscriptionStatus = "active" | "cancelled" | "past_due" | "trialing";

export interface BillingEvent {
  userId: string;
  subscriptionStatus: SubscriptionStatus;
  plan: "free" | "pro";
  expiresAt?: Date;
}

/**
 * HOOK: Called when a subscription becomes active.
 * Replace the stub with real plan update logic.
 */
export async function onSubscriptionActivated(_event: BillingEvent): Promise<void> {
  // TODO: Call usersService.updateUserPlan(event.userId, "pro")
}

/**
 * HOOK: Called when a subscription is cancelled or expires.
 * Replace the stub with real plan update logic.
 */
export async function onSubscriptionCancelled(_event: BillingEvent): Promise<void> {
  // TODO: Call usersService.updateUserPlan(event.userId, "free")
}

/**
 * HOOK: Validates a billing provider webhook signature.
 * Replace with provider-specific signature verification.
 */
export function verifyWebhookSignature(
  _rawBody: string,
  _signature: string,
  _secret: string,
): boolean {
  // TODO: Implement provider-specific HMAC verification (e.g., stripe.webhooks.constructEvent)
  throw new Error("verifyWebhookSignature is not implemented. Add your billing provider SDK.");
}
