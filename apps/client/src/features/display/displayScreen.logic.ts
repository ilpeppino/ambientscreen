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

type DisplayUiState =
  | "loadingWidgets"
  | "error"
  | "empty"
  | "loadingWidgetData"
  | "ready"
  | "unsupported";

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

interface DisplayFrameModel {
  title: string;
  subtitle: string;
  footerLabel: string;
}

export function getDisplayFrameModel(widgetType: WidgetKey | null | undefined): DisplayFrameModel {
  if (!widgetType) {
    return {
      title: "Ambient Display",
      subtitle: "Display Mode",
      footerLabel: "Ambient Screen",
    };
  }

  const manifest = widgetManifests[widgetType];
  const refreshLabel = formatRefreshIntervalLabel(
    getWidgetRefreshIntervalMs(widgetType),
  );

  return {
    title: manifest.name,
    subtitle: "Display Mode",
    footerLabel: `Refresh ${refreshLabel}`,
  };
}
