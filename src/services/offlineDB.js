const DB_NAME = 'CampusUtilityOfflineDB';
const DB_VERSION = 1;
export const QUEUE_EVENT = 'mtt:queue-changed';

export const openDatabase = () =>
  new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION);
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
    request.onupgradeneeded = (event) => {
      const db = event.target.result;
      if (!db.objectStoreNames.contains('syncQueue')) db.createObjectStore('syncQueue', { keyPath: 'id', autoIncrement: true });
      if (!db.objectStoreNames.contains('offlineCache')) db.createObjectStore('offlineCache', { keyPath: 'key' });
    };
  });

// Runs one request in its own transaction and closes the connection afterwards.
async function run(storeName, mode, fn) {
  const db = await openDatabase();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(storeName, mode);
    const req = fn(tx.objectStore(storeName));
    tx.oncomplete = () => { db.close(); resolve(req.result); };
    tx.onerror = tx.onabort = () => { db.close(); reject(tx.error || req.error); };
  });
}

export const saveOfflineData = (store, data) => run(store, 'readwrite', (s) => s.put(data));
export const getOfflineData = (store, key) => run(store, 'readonly', (s) => s.get(key));
export const getAllOfflineData = (store) => run(store, 'readonly', (s) => s.getAll());
export const deleteOfflineData = (store, key) => run(store, 'readwrite', (s) => s.delete(key));

export const notifyQueueChanged = () => window.dispatchEvent(new Event(QUEUE_EVENT));

/**
 * Queue an attendance scan taken without a connection.
 * The selfie is stored as a data URL (Blobs in IndexedDB are unreliable on older iOS Safari)
 * and turned back into a file when it is synced.
 */
export async function saveScanOffline({ fields, photoDataUrl }) {
  const id = await saveOfflineData('syncQueue', {
    type: 'attendance_scan',
    fields,
    photo: photoDataUrl,
    created_at: Date.now(),
  });
  notifyQueueChanged();
  return id;
}

export const getPendingOfflineScans = async () =>
  (await getAllOfflineData('syncQueue')).filter((i) => i.type === 'attendance_scan' && !i.rejected);
