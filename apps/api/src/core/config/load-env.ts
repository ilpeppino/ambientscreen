import fs from "node:fs";
import path from "node:path";

function stripWrappingQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith("\"") && trimmed.endsWith("\"")) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1);
  }

  return trimmed;
}

export function loadEnvFromFile(filePath = path.resolve(process.cwd(), ".env")) {
  if (!fs.existsSync(filePath)) {
    return;
  }

  const fileContents = fs.readFileSync(filePath, "utf8");
  const lines = fileContents.split(/\r?\n/);

  for (const line of lines) {
    const normalizedLine = line.trim();
    if (!normalizedLine || normalizedLine.startsWith("#")) {
      continue;
    }

    const separatorIndex = normalizedLine.indexOf("=");
    if (separatorIndex === -1) {
      continue;
    }

    const key = normalizedLine.slice(0, separatorIndex).trim();
    if (!key || process.env[key] !== undefined) {
      continue;
    }

    const rawValue = normalizedLine.slice(separatorIndex + 1);
    process.env[key] = stripWrappingQuotes(rawValue);
  }
}
