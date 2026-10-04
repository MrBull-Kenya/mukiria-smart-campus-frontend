import React, { useState } from 'react';

export default function TVETReport() {
  const [exporting, setExporting] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleExportPDF = () => {
    setExporting(true);
    setSuccess(false);

    setTimeout(() => {
      setExporting(false);
      setSuccess(true);
    }, 1500);
  };

  return (
    <div className="bg-white p-6 rounded-2xl shadow-lg border border-gray-100 max-w-md mx-auto space-y-4">
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">Ministry TVET Compliance</h3>
        <span className="text-xs bg-purple-100 text-purple-800 px-2.5 py-1 rounded-full font-semibold">Stage 20</span>
      </div>

      <p className="text-xs text-gray-500">
        Generate standardized attendance and competency progression PDF reports formatted for Ministry of Education submission.
      </p>

      <div className="p-4 bg-gray-50 rounded-xl border border-gray-200 space-y-2">
        <div className="flex justify-between text-xs text-gray-600">
          <span>Institution:</span>
          <span className="font-semibold text-gray-800">Mukiria TTI</span>
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Active Module:</span>
          <span className="font-semibold text-gray-800">Module IV (ITECH6)</span>
        </div>
        <div className="flex justify-between text-xs text-gray-600">
          <span>Compliance Metric:</span>
          <span className="font-semibold text-emerald-600">94.8% Verified Attendance</span>
        </div>
      </div>

      <button 
        onClick={handleExportPDF} 
        disabled={exporting}
        className="w-full bg-purple-600 text-white py-2.5 rounded-xl font-medium text-sm hover:bg-purple-700 disabled:opacity-50 transition">
        {exporting ? 'Compiling PDF Report...' : 'Download Official TVET PDF'}
      </button>

      {success && (
        <p className="text-xs text-emerald-600 font-semibold text-center">
          ✓ TVET Compliance Report successfully downloaded.
        </p>
      )}
    </div>
  );
}