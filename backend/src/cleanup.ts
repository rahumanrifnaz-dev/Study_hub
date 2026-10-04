import { pool } from './db.js';

export const cleanupStatus: { lastRun?: string | null; lastRemoved?: number | null } = { lastRun: null, lastRemoved: null };

export async function cleanupPastEvents() {
  const nowIso = new Date().toISOString();
  try {
    const res = await pool.query(`DELETE FROM events WHERE datetime < NOW() RETURNING id`);
    const removed = res.rowCount ?? 0;
    cleanupStatus.lastRun = nowIso;
    cleanupStatus.lastRemoved = removed;

    console.log(`cleanup: run at ${nowIso} — removed ${removed} past event(s)`);
  } catch (err) {
    cleanupStatus.lastRun = nowIso;
    cleanupStatus.lastRemoved = null;
    console.error('cleanupPastEvents failed', err);
  }
}
