import React, { useState } from 'react';
import { MTTI_GEOFENCE } from '../../config/geofence';

export default function FenceChecker() {
  const [status, setStatus] = useState('idle'); // idle, checking, inside, outside
  const [distance, setDistance] = useState(null);
  const [errorMsg, setErrorMsg] = useState('');

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    const R = 6371e3; // Earth radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c; // Distance in meters
  };

  const verifyFence = () => {
    setStatus('checking');
    setErrorMsg('');

    if (!navigator.geolocation) {
      setErrorMsg('Geolocation is not supported by your browser.');
      setStatus('idle');
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const userLat = position.coords.latitude;
        const userLng = position.coords.longitude;
        const dist = calculateDistance(
          userLat,
          userLng,
          MTTI_GEOFENCE.latitude,
          MTTI_GEOFENCE.longitude
        );

        setDistance(Math.round(dist));
        if (dist <= MTTI_GEOFENCE.radiusMeters) {
          setStatus('inside');
        } else {
          setStatus('outside');
        }
      },
      (error) => {
        setErrorMsg('Unable to retrieve your location. Please check GPS settings & ensure Wi-Fi/Location is enabled.');
        setStatus('idle');
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
    );
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Lecture Hall Geofence</h3>
        <span className="text-xs bg-indigo-100 text-indigo-800 px-2.5 py-1 rounded-full font-semibold">Strict Mode</span>
      </div>

      <p className="text-xs text-gray-500">
        Perimeter enforcement around {MTTI_GEOFENCE.name} ({MTTI_GEOFENCE.radiusMeters}m radius threshold).
      </p>

      <div className={`p-4 rounded-xl border text-center ${
        status === 'inside' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' :
        status === 'outside' ? 'bg-rose-50 border-rose-200 text-rose-800' :
        'bg-gray-50 border-gray-200 text-gray-600'
      }`}>
        <p className="text-sm font-bold">
          {status === 'idle' && 'Click below to verify lecture hall proximity'}
          {status === 'checking' && 'Acquiring high-accuracy GPS fix...'}
          {status === 'inside' && `✓ Inside Lecture Hall Boundary (${distance}m from center)`}
          {status === 'outside' && `✕ Outside Boundary (${distance}m away. Must be within ${MTTI_GEOFENCE.radiusMeters}m)`}
        </p>
      </div>

      <button 
        onClick={verifyFence} 
        disabled={status === 'checking'}
        className="w-full bg-indigo-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-indigo-700 disabled:opacity-50 transition">
        {status === 'checking' ? 'Checking Location...' : 'Test Hall Proximity'}
      </button>

      {errorMsg && <p className="text-xs text-rose-600 font-semibold text-center">{errorMsg}</p>}
    </div>
  );
}