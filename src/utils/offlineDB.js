const OFFLINE_QUEUE_KEY = 'mtti_offline_scans_v15';

export const offlineDB = {
  // Save an attendance scan locally when offline
  async saveScanOffline(scanData) {
    try {
      const queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      const newRecord = {
        ...scanData,
        id: 'offline_' + Date.now(),
        timestamp: new Date().toISOString()
      };
      queue.push(newRecord);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return { success: true, id: newRecord.id };
    } catch (err) {
      console.error('Failed to save scan offline:', err);
      return { success: false, error: err.message };
    }
  },

  // Retrieve all pending offline records for synchronization
  async getPendingOfflineScans() {
    try {
      return JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
    } catch (err) {
      console.error('Failed to get offline scans:', err);
      return [];
    }
  },

  // Remove a record from the queue after successful server sync
  async removeOfflineScan(id) {
    try {
      let queue = JSON.parse(localStorage.getItem(OFFLINE_QUEUE_KEY) || '[]');
      queue = queue.filter(item => item.id !== id);
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      return true;
    } catch (err) {
      console.error('Failed to remove synced scan:', err);
      return false;
    }
  },

  // Clear entire queue
  async clearQueue() {
    localStorage.removeItem(OFFLINE_QUEUE_KEY);
  }
};

// Export individual functions explicitly requested across the codebase
export const saveScanOffline = offlineDB.saveScanOffline;
export const getPendingOfflineScans = offlineDB.getPendingOfflineScans;