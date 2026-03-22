import React from "react";
import {
  Calendar,
  Check,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudSun,
  Grid3x3,
  Lock,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Trash2,
  X,
} from "lucide-react-native";
import type { ColorToken } from "../theme";
import {
  getIconColor,
  getIconSize,
  type AppIconSize,
} from "./appIconTokens";

const ICON_MAP = {
  lock: Lock,
  star: Star,
  settings: Settings,
  search: Search,
  refresh: RefreshCw,
  calendar: Calendar,
  weather: CloudSun,
  clock: Clock3,
  grid: Grid3x3,
  chevronLeft: ChevronLeft,
  chevronRight: ChevronRight,
  check: Check,
  plus: Plus,
  close: X,
  trash: Trash2,
} as const;

export type AppIconName = keyof typeof ICON_MAP;

interface AppIconProps {
  name: AppIconName;
  size?: AppIconSize;
  color?: ColorToken;
}

export function AppIcon({
  name,
  size = "md",
  color = "textPrimary",
}: AppIconProps) {
  const Icon = ICON_MAP[name];

  return <Icon size={getIconSize(size)} color={getIconColor(color)} strokeWidth={2} />;
}
