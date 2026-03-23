import { useCallback, useMemo, useState } from "react";
import type { DisplayLayoutWidgetEnvelope } from "../../../services/api/displayLayoutApi";
import { updateWidgetConfig } from "../../../services/api/displayLayoutApi";
import { applyWidgetConfigUpdate } from "../components/WidgetSettingsModal.logic";

interface UseWidgetSettingsOptions {
  widgets: DisplayLayoutWidgetEnvelope[];
  effectiveActiveProfileId: string | null | undefined;
  onAfterSave?: () => Promise<void>;
  onWidgetConfigUpdated: (widgetInstanceId: string, config: Record<string, unknown>) => void;
}

interface UseWidgetSettingsReturn {
  settingsWidgetId: string | null;
  settingsWidget: DisplayLayoutWidgetEnvelope | null;
  savingWidgetConfig: boolean;
  widgetConfigError: string | null;
  setWidgetConfigError: React.Dispatch<React.SetStateAction<string | null>>;
  handleOpenWidgetSettings: (widgetId: string, selectWidget: (id: string) => void) => void;
  handleCloseWidgetSettings: () => void;
  handleSaveWidgetConfig: (config: Record<string, unknown>) => Promise<void>;
}

export function useWidgetSettings({
  widgets,
  effectiveActiveProfileId,
  onAfterSave,
  onWidgetConfigUpdated,
}: UseWidgetSettingsOptions): UseWidgetSettingsReturn {
  const [settingsWidgetId, setSettingsWidgetId] = useState<string | null>(null);
  const [savingWidgetConfig, setSavingWidgetConfig] = useState(false);
  const [widgetConfigError, setWidgetConfigError] = useState<string | null>(null);

  const settingsWidget = useMemo(
    () => widgets.find((widget) => widget.widgetInstanceId === settingsWidgetId) ?? null,
    [settingsWidgetId, widgets],
  );

  const handleOpenWidgetSettings = useCallback((
    widgetId: string,
    selectWidget: (id: string) => void,
  ) => {
    setWidgetConfigError(null);
    setSettingsWidgetId(widgetId);
    selectWidget(widgetId);
  }, []);

  const handleCloseWidgetSettings = useCallback(() => {
    if (savingWidgetConfig) {
      return;
    }

    setWidgetConfigError(null);
    setSettingsWidgetId(null);
  }, [savingWidgetConfig]);

  const handleSaveWidgetConfig = useCallback(async (config: Record<string, unknown>) => {
    if (!settingsWidget) {
      return;
    }

    try {
      setSavingWidgetConfig(true);
      setWidgetConfigError(null);
      await updateWidgetConfig(
        settingsWidget.widgetInstanceId,
        { config },
        effectiveActiveProfileId ?? undefined,
      );

      onWidgetConfigUpdated(settingsWidget.widgetInstanceId, config);
      await onAfterSave?.();
      setSettingsWidgetId(null);
    } catch (err) {
      console.error(err);
      setWidgetConfigError(toErrorMessage(err, "Failed to save widget settings"));
    } finally {
      setSavingWidgetConfig(false);
    }
  }, [effectiveActiveProfileId, onAfterSave, onWidgetConfigUpdated, settingsWidget]);

  return {
    settingsWidgetId,
    settingsWidget,
    savingWidgetConfig,
    widgetConfigError,
    setWidgetConfigError,
    handleOpenWidgetSettings,
    handleCloseWidgetSettings,
    handleSaveWidgetConfig,
  };
}


function toErrorMessage(error: unknown, fallback: string): string {
  if (error instanceof Error && error.message.trim().length > 0) {
    return error.message;
  }

  return fallback;
}
