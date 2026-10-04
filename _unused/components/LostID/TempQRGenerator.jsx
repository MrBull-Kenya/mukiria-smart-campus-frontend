import React, { useState } from 'react';

export default function TempQRGenerator({ admNo = "12154", studentName = "Purity Kainyu" }) {
  const [tokenGenerated, setTokenGenerated] = useState(false);
  const [expiryTime, setExpiryTime] = useState(null);
  const [tempCode, setTempCode] = useState('');

  const generateTempQR = () => {
    const randomHash = Math.random().toString(36).substring(2, 10).toUpperCase();
    const code = `MTTI-TEMP-ID-${admNo}-${randomHash}`;
    setTempCode(code);
    setTokenGenerated(true);

    // Set expiry 24 hours from now
    const expires = new Date(new Date().getTime() + 24 * 60 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    setExpiryTime(expires);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Temporary ID Pass</h3>
        <span className="text-xs bg-amber-100 text-amber-800 px-2.5 py-1 rounded-full font-semibold">Stage 18</span>
      </div>

      <p className="text-xs text-gray-500">
        Lost your physical ID? Generate a secure 24-hour temporary QR token for class access and exam entry.
      </p>

      {!tokenGenerated ? (
        <button 
          onClick={generateTempQR} 
          className="w-full bg-amber-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-amber-700 transition">
          Generate 24hr Temp QR
        </button>
      ) : (
        <div className="space-y-3 text-center">
          <div className="bg-gray-50 p-6 rounded-xl border border-dashed border-gray-300 flex flex-col items-center justify-center space-y-2">
            <div className="w-36 h-36 bg-gray-900 rounded-lg flex items-center justify-center text-white font-mono text-xs p-2 break-all text-center">
              [TEMP PASS QR]<br/>{tempCode}
            </div>
            <p className="text-xs font-bold text-gray-800">{studentName} (ADM: {admNo})</p>
          </div>
          <div className="p-3 bg-amber-50 rounded-xl border border-amber-200 text-xs text-amber-800 font-medium">
            Valid until tomorrow at {expiryTime}. Single-device locked.
          </div>
          <button 
            onClick={() => setTokenGenerated(false)} 
            className="text-xs font-semibold text-gray-500 hover:text-gray-700 underline">
            Revoke / Generate New
          </button>
        </div>
      )}
    </div>
  );
}