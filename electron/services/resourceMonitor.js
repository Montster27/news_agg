const os = require("node:os");

const DEFAULT_MIN_FREE_MEMORY_MB = 768;
const DEFAULT_MAX_PROCESS_RSS_MB = 1024;

function bytesToMegabytes(value) {
  return Number((value / 1024 / 1024).toFixed(1));
}

function readPositiveNumber(value, fallback) {
  const numeric = Number(value);
  return Number.isFinite(numeric) && numeric > 0 ? numeric : fallback;
}

function createResourceMonitor({
  minFreeMemoryMb = readPositiveNumber(
    process.env.NEWS_AGG_MIN_FREE_MEMORY_MB,
    DEFAULT_MIN_FREE_MEMORY_MB,
  ),
  maxProcessRssMb = readPositiveNumber(
    process.env.NEWS_AGG_MAX_PROCESS_RSS_MB,
    DEFAULT_MAX_PROCESS_RSS_MB,
  ),
} = {}) {
  return {
    getMemoryState() {
      const memoryUsage = process.memoryUsage();
      const systemFreeMemory = os.freemem();
      const systemTotalMemory = os.totalmem();
      const systemFreeMemoryMb = bytesToMegabytes(systemFreeMemory);
      const systemTotalMemoryMb = bytesToMegabytes(systemTotalMemory);
      const rssMb = bytesToMegabytes(memoryUsage.rss);
      const heapUsedMb = bytesToMegabytes(memoryUsage.heapUsed);
      const reasons = [];

      if (systemFreeMemoryMb < minFreeMemoryMb) {
        reasons.push(`system free memory below ${minFreeMemoryMb} MB`);
      }

      if (rssMb > maxProcessRssMb) {
        reasons.push(`process RSS above ${maxProcessRssMb} MB`);
      }

      return {
        constrained: reasons.length > 0,
        reasons,
        rssMb,
        heapUsedMb,
        systemFreeMemoryMb,
        systemTotalMemoryMb,
        minFreeMemoryMb,
        maxProcessRssMb,
      };
    },
    start() {
      return {
        cpuUsage: process.cpuUsage(),
        memoryUsage: process.memoryUsage(),
        systemFreeMemory: os.freemem(),
        startedAt: process.hrtime.bigint(),
      };
    },
    finish(sample) {
      if (!sample) {
        return null;
      }

      const durationNs = process.hrtime.bigint() - sample.startedAt;
      const durationMs = Number(durationNs) / 1_000_000;
      const cpuUsage = process.cpuUsage(sample.cpuUsage);
      const memoryUsage = process.memoryUsage();
      const systemFreeMemory = os.freemem();
      const cpuTotalMs = (cpuUsage.user + cpuUsage.system) / 1000;
      const durationForCpuMs = Math.max(durationMs, 1);

      return {
        durationMs: Number(durationMs.toFixed(0)),
        cpuUserMs: Number((cpuUsage.user / 1000).toFixed(1)),
        cpuSystemMs: Number((cpuUsage.system / 1000).toFixed(1)),
        cpuTotalMs: Number(cpuTotalMs.toFixed(1)),
        cpuPercent: Number(((cpuTotalMs / durationForCpuMs) * 100).toFixed(1)),
        rssMb: bytesToMegabytes(memoryUsage.rss),
        rssDeltaMb: bytesToMegabytes(memoryUsage.rss - sample.memoryUsage.rss),
        heapUsedMb: bytesToMegabytes(memoryUsage.heapUsed),
        heapUsedDeltaMb: bytesToMegabytes(
          memoryUsage.heapUsed - sample.memoryUsage.heapUsed,
        ),
        systemFreeMemoryMb: bytesToMegabytes(systemFreeMemory),
        systemFreeMemoryDeltaMb: bytesToMegabytes(
          systemFreeMemory - sample.systemFreeMemory,
        ),
      };
    },
  };
}

module.exports = {
  createResourceMonitor,
};
