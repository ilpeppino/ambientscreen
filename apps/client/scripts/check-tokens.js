#!/usr/bin/env node
/**
 * Token enforcement script for apps/client/src.
 * Detects hardcoded visual values that should use design tokens.
 * Run: node scripts/check-tokens.js
 * Exit 0 = pass, Exit 1 = violations found.
 */

const fs = require("fs");
const path = require("path");

const SRC_DIR = path.join(__dirname, "..", "src");
const THEME_DIR = path.join(SRC_DIR, "shared", "ui", "theme");

// Files that ARE the token system - exclude from checks
const ALLOWED_FILES = [
  path.join(THEME_DIR, "colors.ts"),
  path.join(THEME_DIR, "shadows.ts"),
  path.join(THEME_DIR, "spacing.ts"),
];

// Patterns that are allowed exceptions:
// - rgba() values: used for overlay/translucent effects
// - Percentage values: "100%", "85%"
// - Platform-required literals
// - animation/transform numeric values

const HEX_COLOR_PATTERN = /#([0-9a-fA-F]{3,8})\b/g;
const NAMED_COLOR_PATTERN = /(?<![a-zA-Z])["'](white|black|red|green|blue|yellow|orange|purple|gray|grey|transparent)["']/g;

// Named colors allowed as exceptions (transparent, etc.)
const ALLOWED_NAMED_COLORS = new Set(["transparent"]);

// fontSize values that have no token equivalent and are accepted exceptions
// (documented in docs/ui/TOKEN_ENFORCEMENT.md)
const ACCEPTED_FONT_SIZE_EXCEPTIONS = new Set([11, 15, 22, 24, 25, 26, 28]);

// borderRadius values that have no exact token and are accepted exceptions
const ACCEPTED_RADIUS_EXCEPTIONS = new Set([999, 9999]);

// Spacing token values - raw numbers matching these must use spacing tokens instead
// Values: xs=4, sm=8, md=12, lg=16, screenPadding=20, xl=24, xxl=32
const SPACING_TOKEN_VALUES = new Set([4, 8, 12, 16, 20, 24, 32]);

// Spacing property pattern: padding*, margin*, gap, rowGap, columnGap with a raw integer
// Captures: full property name and the numeric value
const SPACING_PROPERTY_PATTERN = /\b(padding(?:Top|Bottom|Left|Right|Horizontal|Vertical)?|margin(?:Top|Bottom|Left|Right|Horizontal|Vertical)?|gap|rowGap|columnGap)\s*:\s*(\d+)/g;

function getAllTsxFiles(dir) {
  const results = [];
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      results.push(...getAllTsxFiles(fullPath));
    } else if (entry.isFile() && (entry.name.endsWith(".tsx") || entry.name.endsWith(".ts"))) {
      results.push(fullPath);
    }
  }
  return results;
}

function isAllowedFile(filePath) {
  return ALLOWED_FILES.some((allowed) => filePath === allowed);
}

function checkFile(filePath) {
  const violations = [];
  const content = fs.readFileSync(filePath, "utf8");
  const lines = content.split("\n");

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNum = i + 1;

    // Skip comment lines
    if (line.trimStart().startsWith("//") || line.trimStart().startsWith("*")) {
      continue;
    }

    // Check for raw hex colors
    const hexMatches = [...line.matchAll(HEX_COLOR_PATTERN)];
    for (const match of hexMatches) {
      violations.push({
        file: filePath,
        line: lineNum,
        type: "hex-color",
        value: match[0],
        text: line.trim(),
      });
    }

    // Check for named color strings
    const namedMatches = [...line.matchAll(NAMED_COLOR_PATTERN)];
    for (const match of namedMatches) {
      const colorName = match[1];
      if (!ALLOWED_NAMED_COLORS.has(colorName)) {
        violations.push({
          file: filePath,
          line: lineNum,
          type: "named-color",
          value: match[0],
          text: line.trim(),
        });
      }
    }

    // Check for raw spacing values that have token equivalents
    const spacingMatches = [...line.matchAll(SPACING_PROPERTY_PATTERN)];
    for (const match of spacingMatches) {
      const numericValue = parseInt(match[2], 10);
      if (SPACING_TOKEN_VALUES.has(numericValue)) {
        violations.push({
          file: filePath,
          line: lineNum,
          type: "raw-spacing",
          value: `${match[1]}: ${numericValue}`,
          text: line.trim(),
        });
      }
    }
  }

  return violations;
}

function formatViolation(v) {
  const relPath = path.relative(SRC_DIR, v.file);
  return `  ${relPath}:${v.line} [${v.type}] ${v.value}\n    ${v.text}`;
}

function main() {
  const files = getAllTsxFiles(SRC_DIR).filter((f) => !isAllowedFile(f));
  const allViolations = [];

  for (const file of files) {
    const violations = checkFile(file);
    allViolations.push(...violations);
  }

  if (allViolations.length === 0) {
    console.log("✓ Token enforcement: no violations found.");
    process.exit(0);
  }

  console.error(`✗ Token enforcement: ${allViolations.length} violation(s) found.\n`);
  console.error("Violations must be fixed before merge. See docs/ui/TOKEN_ENFORCEMENT.md.\n");

  const byFile = new Map();
  for (const v of allViolations) {
    const key = v.file;
    if (!byFile.has(key)) {
      byFile.set(key, []);
    }
    byFile.get(key).push(v);
  }

  for (const [file, violations] of byFile.entries()) {
    const relPath = path.relative(SRC_DIR, file);
    console.error(`${relPath} (${violations.length} violation(s)):`);
    for (const v of violations) {
      console.error(formatViolation(v));
    }
    console.error("");
  }

  process.exit(1);
}

main();
