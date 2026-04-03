import React from "react";
import {
  AlertTriangle,
  Calendar,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CloudSun,
  Grid3x3,
  Lock,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Settings,
  Star,
  Trash2,
  User,
  X,
} from "lucide-react-native";
import type { ColorToken } from "../theme";
import {
  getIconColor,
  getIconSize,
  type AppIconSize,
} from "./appIconTokens";

const ICON_MAP = {
  alert: AlertTriangle,
  lock: Lock,
  mail: Mail,
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
  chevronDown: ChevronDown,
  check: Check,
  pencil: Pencil,
  plus: Plus,
  close: X,
  trash: Trash2,
  user: User,
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

  return React.createElement(Icon as React.ComponentType<any>, {
    size: getIconSize(size),
    color: getIconColor(color),
    strokeWidth: 2,
  });
}
