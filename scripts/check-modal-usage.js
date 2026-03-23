#!/usr/bin/env node
/**
 * check-modal-usage.js
 *
 * Audits release-scope UI files for disallowed direct React Native Modal usage.
 *
 * Approved modal primitives (use these):
 *   - DialogModal   from shared/ui/overlays
 *   - SheetModal    from shared/ui/overlays
 *   - ConfirmDialog from shared/ui/overlays
 *
 * Disallowed in release-scope feature screens and shared UI:
 *   - import { Modal } from 'react-native'   (direct RN Modal)
 *   - import { ..., Modal, ... } from 'react-native'
 *
 * Exceptions (allowed to use Modal directly):
 *   - The overlay wrappers themselves: src/shared/ui/overlays/*.tsx
 *
 * Usage:
 *   node scripts/check-modal-usage.js
 *   node scripts/check-modal-usage.js --fix   (prints files to fix, no auto-fix)
 *
 * Exit code: 0 = clean, 1 = violations found.
 */

const fs = require("fs");
const path = require("path");

const ROOT = path.resolve(__dirname, "..");
const SCAN_ROOT = path.join(ROOT, "apps/client/src");
const ALLOWED_PATHS = [
  path.join(ROOT, "apps/client/src/shared/ui/overlays"),
];

const MODAL_IMPORT_PATTERN = /\bModal\b/;
const RN_IMPORT_PATTERN = /from\s+['"]react-native['"]/;

let violations = [];

function scanDir(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      scanDir(fullPath);
    } else if (entry.isFile() && /\.(tsx?|jsx?)$/.test(entry.name)) {
      scanFile(fullPath);
    }
  }
}

function scanFile(filePath) {
  // Skip files in allowed directories
  if (ALLOWED_PATHS.some((allowed) => filePath.startsWith(allowed))) {
    return;
  }

  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    // Detect lines that both import from react-native AND include Modal
    if (RN_IMPORT_PATTERN.test(line) && MODAL_IMPORT_PATTERN.test(line)) {
      violations.push({
        file: path.relative(ROOT, filePath),
        line: i + 1,
        text: line.trim(),
      });
    }
  }
}

scanDir(SCAN_ROOT);

if (violations.length === 0) {
  console.log("✓ Modal usage check passed — no direct RN Modal imports in release-scope UI.");
  process.exit(0);
} else {
  console.error(`✗ Modal usage violations found (${violations.length}):\n`);
  for (const v of violations) {
    console.error(`  ${v.file}:${v.line}`);
    console.error(`    ${v.text}\n`);
  }
  console.error(
    "  Fix: replace direct React Native Modal usage with DialogModal, SheetModal,\n" +
    "  or ConfirmDialog from apps/client/src/shared/ui/overlays.\n",
  );
  process.exit(1);
}
