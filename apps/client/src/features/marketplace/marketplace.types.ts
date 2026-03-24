export interface MarketplacePlugin {
  /** Registry plugin id */
  id: string;
  key: string;
  name: string;
  description: string;
  category: string;
  isPremium: boolean;
  activeVersion: { version: string } | null;
  isInstalled: boolean;
  isEnabled: boolean;
  /** InstalledPlugin.id — present only when installed */
  installationId: string | null;
}

export type MarketplaceFilter =
  | "all"
  | "installed"
  | "not-installed"
  | "premium"
  | "free"
  | "enabled"
  | "disabled";
