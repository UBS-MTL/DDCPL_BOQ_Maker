const SIX_HOURS = 6 * 60 * 60 * 1000;

const globalState = globalThis as unknown as {
  __reminderSchedulerStarted?: boolean;
};

async function safeSweep() {
  try {
    const { runReminderSweep } = await import("@/lib/reminders");
    const result = await runReminderSweep();
    const total = result.expired + result.followUpNotifications + result.expiryNotifications;
    if (total > 0) {
      console.log(
        `[reminders] sweep: ${result.expired} expired, ${result.followUpNotifications} follow-up, ${result.expiryNotifications} expiry notifications`
      );
    }
  } catch (error) {
    console.error("[reminders] sweep failed:", error);
  }
}

export function startReminderScheduler() {
  if (globalState.__reminderSchedulerStarted) return;
  globalState.__reminderSchedulerStarted = true;

  const initial = setTimeout(safeSweep, 10_000);
  const interval = setInterval(safeSweep, SIX_HOURS);

  // Do not keep the process alive solely for the scheduler
  if (typeof initial.unref === "function") initial.unref();
  if (typeof interval.unref === "function") interval.unref();

  console.log("[reminders] scheduler started (initial sweep in 10s, then every 6h)");
}
