/**
 * Approved modal primitives for Ambient Screen.
 *
 * APPROVED wrappers (use these):
 *   - DialogModal   — centered card overlay (settings, upsell, info)
 *   - SheetModal    — full-screen page sheet (detail views, long flows)
 *   - ConfirmDialog — destructive/critical action confirmation
 *
 * DISALLOWED in release-scope UI:
 *   - Direct React Native `Modal` usage in feature screens
 *   - Ad-hoc backdrop/card layouts duplicating this contract
 *
 * See scripts/check-modal-usage.js for the enforcement audit.
 */
export { DialogModal } from "./DialogModal";
export type { DialogModalProps } from "./DialogModal";
export { SheetModal } from "./SheetModal";
export type { SheetModalProps } from "./SheetModal";
export { ConfirmDialog } from "./ConfirmDialog";
export type { ConfirmDialogProps } from "./ConfirmDialog";
