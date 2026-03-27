export const SIDEBAR_MIN_WIDTH = 200;
export const SIDEBAR_DEFAULT_WIDTH = 288;
export const SIDEBAR_MAX_RATIO = 0.3;

/**
 * Clamp a proposed sidebar width to [SIDEBAR_MIN_WIDTH, 30% of viewport].
 */
export function clampSidebarWidth(width: number, windowWidth: number): number {
  const max = computeMaxSidebarWidth(windowWidth);
  return Math.max(SIDEBAR_MIN_WIDTH, Math.min(width, max));
}

/**
 * Return the maximum allowed sidebar width for a given viewport width.
 */
export function computeMaxSidebarWidth(windowWidth: number): number {
  return Math.floor(windowWidth * SIDEBAR_MAX_RATIO);
}
