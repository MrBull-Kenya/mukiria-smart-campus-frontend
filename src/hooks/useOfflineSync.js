import { useState, useEffect, useCallback } from 'react';
import { getAllOfflineData, deleteOfflineData, saveOfflineData, QUEUE_EVENT } from '../services/offlineDB';
import { submitScan, dataUrlToBlob } from '../services/attendance';
import api from '../services/api';

// One shared lock so several components using this hook can't upload the same scan twice.
let inFlight = null;

const replay = (item) => {
  if (item.type === 'attendance_scan') {
    return submitScan({ ...item.fields, is_offline_synced: true }, dataUrlToBlob(item.photo));
  }
  return api({ method: item.method || 'POST', url: item.url, data: item.data });
};

// Network problems, timeouts, 5xx and expired sessions are worth retrying later.
// Anything else (e.g. 403 outside geofence) will never succeed, so flag it instead of looping forever.
const isRetryable = (err) => {
  const s = err?.response?.status;
  return !s || s >= 500 || s === 401 || s === 408 || s === 429;
};

async function syncAll() {
  const items = await getAllOfflineData('syncQueue');
  let synced = 0, failed = 0;
  for (const item of items) {
    if (item.rejected) continue;
    try {
      await replay(item);
      await deleteOfflineData('syncQueue', item.id);
      synced++;
    } catch (err) {
      failed++;
      if (!isRetryable(err)) {
        const reason = err?.response?.data?.error || err?.response?.data?.message || 'Rejected by server';
        await saveOfflineData('syncQueue', { ...item, rejected: true, reason });
      }
    }
  }
  return { synced, failed };
}

export function useOfflineSync() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [syncing, setSyncing] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [rejected, setRejected] = useState([]);

  const refresh = useCallback(async () => {
    try {
      const items = await getAllOfflineData('syncQueue');
      setPendingCount(items.filter((i) => !i.rejected).length);
      setRejected(items.filter((i) => i.rejected));
    } catch (err) {
      console.error('Failed to read sync queue:', err);
    }
  }, []);

  const triggerSync = useCallback(async () => {
    if (!navigator.onLine) return { synced: 0, failed: 0 };
    if (!inFlight) {
      inFlight = syncAll().finally(() => { inFlight = null; });
    }
    setSyncing(true);
    try {
      return await inFlight;
    } finally {
      setSyncing(false);
      refresh();
    }
  }, [refresh]);

  const clearRejected = useCallback(async () => {
    const items = await getAllOfflineData('syncQueue');
    await Promise.all(items.filter((i) => i.rejected).map((i) => deleteOfflineData('syncQueue', i.id)));
    refresh();
  }, [refresh]);

  useEffect(() => {
    const goOnline = () => { setIsOnline(true); triggerSync(); };
    const goOffline = () => setIsOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    window.addEventListener(QUEUE_EVENT, refresh);

    refresh().then(() => { if (navigator.onLine) triggerSync(); });

    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.removeEventListener(QUEUE_EVENT, refresh);
    };
  }, [refresh, triggerSync]);

  return { isOnline, syncing, pendingCount, rejected, triggerSync, clearRejected };
}
