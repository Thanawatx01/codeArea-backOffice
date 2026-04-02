const { performance } = require('node:perf_hooks');

/**
 * ค่าเปรียบเทียบกับ PHP (int)(microtime(true) * 1_000_000) — จำนวนเต็มไมโครวินาทีจาก Unix epoch
 * ใช้เป็น submission.pid (public ref สำหรับ URL / client)
 */
function submissionPidMicrotime() {
  const tMs =
    typeof performance.timeOrigin === 'number' && Number.isFinite(performance.timeOrigin)
      ? performance.timeOrigin + performance.now()
      : Date.now();
  return Math.floor(tMs * 1000);
}

module.exports = { submissionPidMicrotime };
