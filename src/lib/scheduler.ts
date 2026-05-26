import { refreshBriefings } from "./briefing";

const globalForScheduler = globalThis as typeof globalThis & {
  aiBriefingSchedulerStarted?: boolean;
};

function msUntilNextShanghaiNine() {
  const now = new Date();
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
  return Math.max(1000, next.getTime() - now.getTime());
}

export function startScheduler() {
  if (globalForScheduler.aiBriefingSchedulerStarted) return;
  globalForScheduler.aiBriefingSchedulerStarted = true;

  const run = async () => {
    try {
      await refreshBriefings();
    } finally {
      setTimeout(run, msUntilNextShanghaiNine());
    }
  };

  setTimeout(run, msUntilNextShanghaiNine());
}
