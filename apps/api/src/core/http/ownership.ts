import { apiErrors } from "./api-error";

/**
 * Asserts that a resource exists and belongs to the authenticated user.
 *
 * Services return null when a resource is not found OR does not belong to the
 * requesting user — both cases are surfaced as 404 to avoid leaking resource
 * existence to unauthorized callers.
 *
 * Usage:
 *   const profile = await profilesService.getProfileByIdForUser({ userId, profileId });
 *   assertUserOwnsResource(profile, "Profile");
 *   // profile is now narrowed to non-null
 */
export function assertUserOwnsResource<T>(
  resource: T | null | undefined,
  resourceLabel = "Resource",
): asserts resource is T {
  if (resource === null || resource === undefined) {
    throw apiErrors.notFound(`${resourceLabel} not found`);
  }
}

/**
 * Ownership assertion for profiles.
 * Call after `profilesService.getProfileByIdForUser`.
 */
export function assertUserOwnsProfile<T>(resource: T | null | undefined): asserts resource is T {
  assertUserOwnsResource(resource, "Profile");
}

/**
 * Ownership assertion for devices.
 * Call after `devicesService.getDeviceForUser`.
 */
export function assertUserOwnsDevice<T>(resource: T | null | undefined): asserts resource is T {
  assertUserOwnsResource(resource, "Device");
}

/**
 * Ownership assertion for widgets.
 * Call after `widgetsService.getWidgetByIdForUser`.
 */
export function assertUserOwnsWidget<T>(resource: T | null | undefined): asserts resource is T {
  assertUserOwnsResource(resource, "Widget");
}
