import React, { useState } from 'react';
import { verifyCampusGeofence } from '../../services/geolocation';
import { CAMPUS } from '../../config/campus';

export default function FenceChecker() {
  const [status, setStatus] = useState('idle'); // idle | checking | inside | outside
  const [distance, setDistance] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const verifyFence = async () => {
    setStatus('checking');
    setErrorMsg('');
    try {
      const r = await verifyCampusGeofence();
      setDistance(r.distance);
      setStatus(r.isWithinCampus ? 'inside' : 'outside');
    } catch {
      setErrorMsg('Unable to retrieve your location. Please check GPS settings.');
      setStatus('idle');
    }
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">MTTI Geofence Status</h3>
        <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full font-semibold">GPS</span>
      </div>
      <p className="text-xs text-gray-500">Check-ins are only accepted within {CAMPUS.radiusMeters} m of the campus centre.</p>

      <div className={`p-4 rounded-xl border text-center ${
        status === 'inside' ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
        : status === 'outside' ? 'bg-rose-50 border-rose-200 text-rose-800'
        : 'bg-gray-50 border-gray-200 text-gray-600'}`}>
        <p className="text-sm font-bold">
          {status === 'idle' && 'Tap below to verify your campus location'}
          {status === 'checking' && 'Acquiring high-accuracy GPS fix…'}
          {status === 'inside' && `✓ Inside MTTI boundary (${distance} m from centre)`}
          {status === 'outside' && `✕ Outside boundary (${distance} m away; must be within ${CAMPUS.radiusMeters} m)`}
        </p>
      </div>

      <button onClick={verifyFence} disabled={status === 'checking'}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
        {status === 'checking' ? 'Checking…' : 'Test geofence range'}
      </button>
      {errorMsg && <p className="text-xs text-rose-600 font-semibold text-center">{errorMsg}</p>}
    </div>
  );
}
