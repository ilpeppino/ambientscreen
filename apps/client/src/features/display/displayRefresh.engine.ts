import type { WidgetKey } from "@ambient/shared-contracts";
import { getDisplayRefreshIntervalMs } from "./displayScreen.logic";

type IntervalHandle = ReturnType<typeof setInterval>;

interface TimerApi {
  setInterval: (callback: () => void, intervalMs: number) => IntervalHandle;
  clearInterval: (intervalId: IntervalHandle) => void;
}

interface StartDisplayRefreshInput {
  widgetInstanceId: string;
  widgetType: WidgetKey;
  onRefresh: () => void;
}

export interface DisplayRefreshEngine {
  start: (input: StartDisplayRefreshInput) => void;
  stop: () => void;
}

const defaultTimerApi: TimerApi = {
  setInterval: (callback, intervalMs) => setInterval(callback, intervalMs),
  clearInterval: (intervalId) => clearInterval(intervalId),
};

export function createDisplayRefreshEngine(
  timerApi: TimerApi = defaultTimerApi,
): DisplayRefreshEngine {
  let activeWidgetSignature: string | null = null;
  let intervalId: IntervalHandle | null = null;

  function stop() {
    if (intervalId !== null) {
      timerApi.clearInterval(intervalId);
      intervalId = null;
    }
    activeWidgetSignature = null;
  }

  function start(input: StartDisplayRefreshInput) {
    const nextSignature = `${input.widgetInstanceId}:${input.widgetType}`;
    if (activeWidgetSignature === nextSignature) {
      return;
    }

    stop();
    activeWidgetSignature = nextSignature;
    input.onRefresh();

    const intervalMs = getDisplayRefreshIntervalMs(input.widgetType);
    if (intervalMs === null) {
      return;
    }

    intervalId = timerApi.setInterval(() => {
      input.onRefresh();
    }, intervalMs);
  }

  return {
    start,
    stop,
  };
}
