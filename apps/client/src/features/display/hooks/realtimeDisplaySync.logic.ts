export interface DebouncedRefreshTrigger {
  trigger: () => void;
  cancel: () => void;
}

export function createRefreshDebouncer(
  callback: () => void,
  debounceMs: number,
): DebouncedRefreshTrigger {
  let timeoutHandle: ReturnType<typeof setTimeout> | null = null;

  return {
    trigger() {
      if (timeoutHandle) {
        clearTimeout(timeoutHandle);
      }

      timeoutHandle = setTimeout(() => {
        timeoutHandle = null;
        callback();
      }, debounceMs);
    },
    cancel() {
      if (!timeoutHandle) {
        return;
      }

      clearTimeout(timeoutHandle);
      timeoutHandle = null;
    },
  };
}
