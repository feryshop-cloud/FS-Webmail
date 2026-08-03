import { supabase } from './client';
import { logger } from '../utils/logger';

/**
 * Heartbeat dengan exponential backoff retry per PRD Bab 3.3.
 * Retry pattern: delay = baseDelayMs * 2^(attempt-1), max 300000ms (5 menit).
 * Max attempts = 10. Jika gagal permanen (10x), log error saja — worker TIDAK boleh crash.
 * Interval heartbeat tetap 2 menit (120000ms) per PRD Bab 3.5.
 */

const MAX_RETRY_DELAY_MS = 300000; // 5 menit — batas atas backoff per PRD

async function sendHeartbeatWithRetry(
  workerName: string,
  attempt: number = 1,
  maxAttempts: number = 10,
  baseDelayMs: number = 1000
): Promise<void> {
  try {
    const { error } = await supabase
      .from('worker_heartbeat')
      .update({ last_ping: new Date().toISOString() })
      .eq('worker_name', workerName);

    if (error) {
      throw new Error(error.message);
    }

    logger.info('Heartbeat updated successfully', { workerName });
  } catch (err: any) {
    if (attempt >= maxAttempts) {
      // Gagal permanen setelah 10 percobaan — log saja, worker TIDAK crash
      logger.error('Heartbeat failed permanently after max retries', {
        workerName,
        attempt,
        maxAttempts,
        error: err.message,
      });
      return;
    }

    // Exponential backoff: delay = baseDelayMs * 2^(attempt-1), capped at 5 menit
    const retryDelay = Math.min(baseDelayMs * Math.pow(2, attempt - 1), MAX_RETRY_DELAY_MS);
    logger.error('Heartbeat failed, retrying with backoff', {
      workerName,
      attempt,
      maxAttempts,
      retryDelayMs: retryDelay,
      error: err.message,
    });

    await new Promise((resolve) => setTimeout(resolve, retryDelay));
    return sendHeartbeatWithRetry(workerName, attempt + 1, maxAttempts, baseDelayMs);
  }
}

export async function startHeartbeat() {
  const intervalMs = parseInt(process.env.HEARTBEAT_INTERVAL_MS || '120000', 10);
  const workerName = process.env.WORKER_NAME || 'imap-worker-main';

  // Kirim heartbeat pertama segera saat startup
  await sendHeartbeatWithRetry(workerName);

  // Ulangi setiap 2 menit (120000ms) — interval tetap, retry hanya di dalam sendHeartbeatWithRetry
  setInterval(() => sendHeartbeatWithRetry(workerName), intervalMs);
  logger.info('Heartbeat scheduler started', { intervalMs, workerName });
}
