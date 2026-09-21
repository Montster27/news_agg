function createScheduler({ refreshService, getIntervalMinutes, getLastRefresh }) {
  let timer = null;
  let launchTimer = null;

  function intervalMinutes() {
    const value = Number(getIntervalMinutes?.() ?? 60);
    return Number.isFinite(value) ? Math.max(5, value) : 60;
  }

  function runIfStale(options) {
    const lastRefresh = Date.parse(getLastRefresh?.() ?? "");
    if (Number.isFinite(lastRefresh) && Date.now() - lastRefresh < intervalMinutes() * 60_000) return;
    void Promise.resolve().then(() => refreshService.runRefresh(options)).catch((error) => {
      console.warn("[scheduler] Refresh failed:", error instanceof Error ? error.message : "Unknown error");
    });
  }

  function stop() {
    if (timer) clearInterval(timer);
    if (launchTimer) clearTimeout(launchTimer);
    timer = null;
    launchTimer = null;
  }

  function start() {
    stop();
    const minutes = intervalMinutes();
    timer = setInterval(() => runIfStale({ scheduled: true }), minutes * 60_000);
    return minutes;
  }

  function runAfterDelay(delayMs = 2500) {
    if (launchTimer) clearTimeout(launchTimer);
    launchTimer = setTimeout(() => {
      launchTimer = null;
      runIfStale({ launch: true });
    }, delayMs);
  }

  function isRunning() { return Boolean(timer); }

  return { isRunning, runAfterDelay, start, stop };
}

module.exports = { createScheduler };
