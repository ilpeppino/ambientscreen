export interface OrientationApi {
  lock: () => Promise<void>;
  unlock: () => Promise<void>;
}

export interface OrientationLogger {
  warn: (message: string, error: unknown) => void;
}

interface OrientationLifecycle {
  enable: () => void;
  disable: () => void;
}

export function createDisplayOrientationLifecycle(
  api: OrientationApi,
  logger: OrientationLogger,
): OrientationLifecycle {
  let leaseCount = 0;
  let isLandscapeLocked = false;
  let isReconciling = false;

  async function reconcile() {
    if (isReconciling) {
      return;
    }

    isReconciling = true;
    try {
      while (true) {
        const shouldLockLandscape = leaseCount > 0;
        if (shouldLockLandscape === isLandscapeLocked) {
          break;
        }

        if (shouldLockLandscape) {
          try {
            await api.lock();
            isLandscapeLocked = true;
          } catch (error) {
            logger.warn("Failed to lock landscape orientation", error);
            break;
          }
          continue;
        }

        try {
          await api.unlock();
          isLandscapeLocked = false;
        } catch (error) {
          logger.warn("Failed to restore orientation", error);
          break;
        }
      }
    } finally {
      isReconciling = false;
    }
  }

  function enable() {
    leaseCount += 1;
    void reconcile();
  }

  function disable() {
    leaseCount = Math.max(0, leaseCount - 1);
    void reconcile();
  }

  return {
    enable,
    disable,
  };
}
