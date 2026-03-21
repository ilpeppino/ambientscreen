import { sharedSessionsService } from "./sharedSessions.service";

const ROTATION_TICK_MS = 1000;

let schedulerHandle: ReturnType<typeof setInterval> | null = null;
let running = false;

async function runRotationTick() {
  if (running) {
    return;
  }

  running = true;
  try {
    const advancedCount = await sharedSessionsService.advanceDueSessionRotations(new Date());
    if (advancedCount > 0) {
      console.info("[shared-session] tick advanced sessions", { advancedCount });
    }
  } catch (error) {
    console.error("[shared-session] rotation tick failed", error);
  } finally {
    running = false;
  }
}

export function startSharedSessionScheduler() {
  if (schedulerHandle) {
    return;
  }

  schedulerHandle = setInterval(() => {
    void runRotationTick();
  }, ROTATION_TICK_MS);
}

export function stopSharedSessionScheduler() {
  if (!schedulerHandle) {
    return;
  }

  clearInterval(schedulerHandle);
  schedulerHandle = null;
}
