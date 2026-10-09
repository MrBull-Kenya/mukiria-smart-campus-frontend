import pool from '../config/db.js';

export const offlineSyncHandler = {
  async processBatchSync(offlineLogs) {
    const results = { syncedCount: 0, failedCount: 0, errors: [] };

    for (const log of offlineLogs) {
      try {
        await pool.query(
          `INSERT INTO attendance_logs (session_id, adm_no, photo_url, gps_lat, gps_lng, is_late, is_offline_synced, device_id, points_earned, timestamp)
           VALUES (?, ?, ?, ?, ?, ?, TRUE, ?, ?, ?)`,
          [
            log.session_id,
            log.adm_no,
            log.photo_url || null,
            log.gps_lat || null,
            log.gps_lng || null,
            log.is_late || false,
            log.device_id || null,
            log.points_earned || 5,
            log.timestamp || new Date()
          ]
        );
        results.syncedCount++;
      } catch (err) {
        results.failedCount++;
        results.errors.push({ adm_no: log.adm_no, error: err.message });
      }
    }

    return results;
  }
};