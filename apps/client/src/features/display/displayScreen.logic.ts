import type { WidgetKey } from "@ambient/shared-contracts";
import { formatRefreshIntervalLabel, getWidgetRefreshIntervalMs, widgetManifests } from "../../widgets/widget.manifests";

interface SelectableWidget {
  id: string;
  isActive: boolean;
}

export function selectDisplayWidget<TWidget extends SelectableWidget>(
  widgets: TWidget[],
  previous: TWidget | null,
): TWidget | null {
  const activeWidget = widgets.find((widget) => widget.isActive);
  if (activeWidget) {
    return activeWidget;
  }

  if (previous) {
    const stillExists = widgets.find((widget) => widget.id === previous.id);
    if (stillExists) {
      return stillExists;
    }
  }

  return widgets[0] ?? null;
}

export function getDisplayRefreshIntervalMs(
  widgetType: WidgetKey | null | undefined,
): number | null {
  return getWidgetRefreshIntervalMs(widgetType);
}

export function getEffectivePollingIntervalMs(
  baseIntervalMs: number,
  realtimeConnectionState: "connecting" | "connected" | "disconnected" | "error",
): number {
  if (realtimeConnectionState === "connected") {
    return Math.max(baseIntervalMs, 120000);
  }

  return baseIntervalMs;
}

type DisplayUiState =
  | "loadingWidgets"
  | "error"
  | "empty"
  | "loadingWidgetData"
  | "ready"
  | "unsupported";

type DisplayStatusTone = "neutral" | "error";

interface DisplayStatusModel {
  title: string;
  message: string;
  tone: DisplayStatusTone;
  showSpinner: boolean;
}

interface ResolveDisplayUiStateInput {
  loadingWidgets: boolean;
  loadingWidgetData: boolean;
  hasError: boolean;
  hasSelectedWidget: boolean;
  hasWidgetData: boolean;
}

export function resolveDisplayUiState(input: ResolveDisplayUiStateInput): DisplayUiState {
  if (input.loadingWidgets) {
    return "loadingWidgets";
  }

  if (input.hasError) {
    return "error";
  }

  if (!input.hasSelectedWidget) {
    return "empty";
  }

  if (input.loadingWidgetData && !input.hasWidgetData) {
    return "loadingWidgetData";
  }

  if (input.hasWidgetData) {
    return "ready";
  }

  return "unsupported";
}

export function getDisplayStatusModel(
  uiState: Exclude<DisplayUiState, "ready">,
  errorMessage: string | null,
): DisplayStatusModel {
  if (uiState === "loadingWidgets") {
    return {
      title: "Preparing display",
      message: "Loading widgets and display settings.",
      tone: "neutral",
      showSpinner: true,
    };
  }

  if (uiState === "loadingWidgetData") {
    return {
      title: "Refreshing content",
      message: "Fetching the latest widget data.",
      tone: "neutral",
      showSpinner: true,
    };
  }

  if (uiState === "error") {
    return {
      title: "Display unavailable",
      message: errorMessage ?? "An unexpected error occurred while loading data.",
      tone: "error",
      showSpinner: false,
    };
  }

  if (uiState === "empty") {
    return {
      title: "No widgets configured",
      message: "Create a widget in admin mode to start ambient display.",
      tone: "neutral",
      showSpinner: false,
    };
  }

  return {
    title: "Unsupported widget",
    message: "This widget type is not available in display mode yet.",
    tone: "error",
    showSpinner: false,
  };
}

interface DisplayFrameModel {
  title: string;
  subtitle: string;
  footerLabel: string;
}

export function getDisplayFrameModel(widgetType: WidgetKey | null | undefined): DisplayFrameModel {
  if (!widgetType) {
    return {
      title: "Ambient Display",
      subtitle: "Live ambient mode",
      footerLabel: "Ambient Screen",
    };
  }

  const manifest = widgetManifests[widgetType];
  const refreshLabel = formatRefreshIntervalLabel(
    getWidgetRefreshIntervalMs(widgetType),
  );

  return {
    title: manifest.name,
    subtitle: "Live ambient mode",
    footerLabel: `Refresh ${refreshLabel}`,
  };
}
