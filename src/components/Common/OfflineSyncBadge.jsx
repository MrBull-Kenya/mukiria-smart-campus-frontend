import React from 'react';
import { useOfflineSync } from '../../hooks/useOfflineSync';

export default function OfflineSyncBadge() {
  const { isOnline, pendingCount, syncing, rejected, triggerSync, clearRejected } = useOfflineSync();

  return (
    <div className="space-y-2">
      {pendingCount === 0 ? (
        <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
            <span className="text-xs font-semibold text-emerald-800">All scans synced</span>
          </div>
          <span className="text-[10px] text-emerald-600 font-mono">{isOnline ? 'Online' : 'Offline'}</span>
        </div>
      ) : (
        <div className="bg-amber-50 border border-amber-200 p-3 rounded-xl flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
            <span className="text-xs font-bold text-amber-800">{pendingCount} pending offline scan(s)</span>
          </div>
          <button onClick={triggerSync} disabled={syncing || !isOnline}
            className="bg-amber-600 text-white text-[10px] font-semibold px-3 py-1 rounded-lg hover:bg-amber-700 disabled:opacity-50 transition">
            {syncing ? 'Syncing…' : isOnline ? 'Sync now' : 'Waiting for network'}
          </button>
        </div>
      )}

      {rejected.length > 0 && (
        <div className="bg-rose-50 border border-rose-200 p-3 rounded-xl text-left space-y-1">
          <p className="text-xs font-bold text-rose-800">{rejected.length} scan(s) were rejected by the server</p>
          {rejected.slice(0, 3).map((r) => <p key={r.id} className="text-[11px] text-rose-700">• {r.reason}</p>)}
          <button onClick={clearRejected} className="text-[10px] font-bold text-rose-700 underline">Dismiss</button>
        </div>
      )}
    </div>
  );
}
