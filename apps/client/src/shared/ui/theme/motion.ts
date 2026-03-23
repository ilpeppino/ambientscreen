import { Easing } from "react-native-reanimated";

export const motion = {
  /** Quick interactions and gesture snap-backs */
  fast: 150,
  /** Standard enter/exit transitions */
  normal: 250,
  /** Deliberate, slow transitions */
  slow: 400,
} as const;

export const easing = {
  /** General-purpose: symmetrical accelerate-then-decelerate */
  standard: Easing.bezier(0.4, 0, 0.2, 1),
  /** Enter: content arrives with deceleration */
  decelerate: Easing.out(Easing.cubic),
  /** Exit: content leaves with acceleration */
  accelerate: Easing.in(Easing.cubic),
  /** Cross-fade: symmetric ease-in-out */
  inOut: Easing.inOut(Easing.quad),
} as const;

export type MotionToken = keyof typeof motion;
export type EasingToken = keyof typeof easing;
