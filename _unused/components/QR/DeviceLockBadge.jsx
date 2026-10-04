import React from 'react';

export default function DeviceLockBadge({ admNo, deviceModel = "Verified Mobile Device", isLocked = true }) {
  return (
    <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100 flex items-center justify-between">
      <div className="flex items-center space-x-3">
        <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold text-white ${isLocked ? 'bg-emerald-600' : 'bg-amber-500'}`}>
          {isLocked ? '🔒' : '⚠️'}
        </div>
        <div>
          <h4 className="text-sm font-bold text-gray-800">Device Lock Status</h4>
          <p className="text-xs text-gray-500">ADM: {admNo} • {deviceModel}</p>
        </div>
      </div>
      <span className={`text-xs font-semibold px-3 py-1 rounded-full ${isLocked ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}`}>
        {isLocked ? 'One Phone = One ADM' : 'Unbound'}
      </span>
    </div>
  );
}