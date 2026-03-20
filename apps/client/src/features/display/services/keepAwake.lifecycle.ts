export interface KeepAwakeApi {
  activate: (tag: string) => Promise<void>;
  deactivate: (tag: string) => void;
}

export interface KeepAwakeLogger {
  warn: (message: string, error: unknown) => void;
}

interface KeepAwakeLifecycle {
  enable: () => void;
  disable: () => void;
}

const DISPLAY_MODE_KEEP_AWAKE_TAG = "display-mode";

export function createDisplayKeepAwakeLifecycle(
  api: KeepAwakeApi,
  logger: KeepAwakeLogger,
): KeepAwakeLifecycle {
  let leaseCount = 0;
  let activationToken = 0;

  function activate(token: number) {
    return api
      .activate(DISPLAY_MODE_KEEP_AWAKE_TAG)
      .then(() => {
        if (leaseCount === 0 && token === activationToken) {
          api.deactivate(DISPLAY_MODE_KEEP_AWAKE_TAG);
        }
      })
      .catch((error: unknown) => {
        logger.warn("Failed to enable keep awake", error);
      });
  }

  function disable() {
    if (leaseCount === 0) {
      return;
    }

    leaseCount -= 1;
    if (leaseCount > 0) {
      return;
    }

    try {
      api.deactivate(DISPLAY_MODE_KEEP_AWAKE_TAG);
    } catch (error) {
      logger.warn("Failed to disable keep awake", error);
    }
  }

  function enable() {
    leaseCount += 1;
    if (leaseCount > 1) {
      return;
    }

    activationToken += 1;
    const token = activationToken;
    void activate(token);
  }

  return {
    enable,
    disable,
  };
}
