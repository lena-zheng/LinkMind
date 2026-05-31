import { refreshBriefings } from "./briefing";

const globalForScheduler = globalThis as typeof globalThis & {
  aiBriefingSchedulerStarted?: boolean;
  aiBriefingLastRunAt?: string;
  aiBriefingLastSuccessAt?: string;
  aiBriefingLastError?: string | null;
  aiBriefingNextRunAt?: string;
};

function nextShanghaiNineFrom(now: Date) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Shanghai",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(now);
  const year = Number(parts.find((part) => part.type === "year")?.value);
  const month = Number(parts.find((part) => part.type === "month")?.value);
  const day = Number(parts.find((part) => part.type === "day")?.value);
  let next = new Date(Date.UTC(year, month - 1, day, 1, 0, 0));
  if (next <= now) next = new Date(next.getTime() + 24 * 60 * 60 * 1000);
  return next;
}

function scheduleNext(run: () => Promise<void>) {
  const nextRun = nextShanghaiNineFrom(new Date());
  globalForScheduler.aiBriefingNextRunAt = nextRun.toISOString();
  const delay = Math.max(1000, nextRun.getTime() - Date.now());
  setTimeout(run, delay);
}

export function getSchedulerStatus() {
  return {
    started: Boolean(globalForScheduler.aiBriefingSchedulerStarted),
    lastRunAt: globalForScheduler.aiBriefingLastRunAt || null,
    lastSuccessAt: globalForScheduler.aiBriefingLastSuccessAt || null,
    lastError: globalForScheduler.aiBriefingLastError || null,
    nextRunAt: globalForScheduler.aiBriefingNextRunAt || null,
  };
}

export function startScheduler() {
  if (globalForScheduler.aiBriefingSchedulerStarted) return;
  globalForScheduler.aiBriefingSchedulerStarted = true;
  globalForScheduler.aiBriefingLastError = null;

  const run = async () => {
    globalForScheduler.aiBriefingLastRunAt = new Date().toISOString();
    try {
      await refreshBriefings();
      globalForScheduler.aiBriefingLastSuccessAt = new Date().toISOString();
      globalForScheduler.aiBriefingLastError = null;
    } catch (error) {
      globalForScheduler.aiBriefingLastError = error instanceof Error ? error.message : "Unknown error";
    } finally {
      scheduleNext(run);
    }
  };

  void run();
}
