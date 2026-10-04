import React from 'react';

export default function AtRiskCard({ attendanceRate = 65, studentName = "Purity Kainyu", adm = "12154" }) {
  const isAtRisk = attendanceRate < 68;

  return (
    <div className={`p-6 rounded-2xl shadow-lg border ${
      isAtRisk ? 'bg-rose-50/50 border-rose-200' : 'bg-emerald-50/50 border-emerald-200'
    } max-w-md mx-auto space-y-4`}>
      <div className="flex justify-between items-center">
        <h3 className="text-lg font-bold text-gray-800">At-Risk Predictor</h3>
        <span className={`text-xs px-2.5 py-1 rounded-full font-semibold ${
          isAtRisk ? 'bg-rose-100 text-rose-800' : 'bg-emerald-100 text-emerald-800'
        }`}>
          {isAtRisk ? '⚠ 68% Threshold Alert' : '✓ Safe Standing'}
        </span>
      </div>

      <div className="space-y-1">
        <div className="flex justify-between text-xs font-medium text-gray-600">
          <span>Student: {studentName} ({adm})</span>
          <span className={isAtRisk ? 'text-rose-600 font-bold' : 'text-emerald-600 font-bold'}>{attendanceRate}% Rate</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2.5 overflow-hidden">
          <div 
            className={`h-2.5 rounded-full transition-all duration-500 ${isAtRisk ? 'bg-rose-600' : 'bg-emerald-600'}`} 
            style={{ width: `${attendanceRate}%` }}
          />
        </div>
      </div>

      <p className="text-xs text-gray-600 leading-relaxed">
        {isAtRisk 
          ? 'Attendance has dropped below the mandatory 68% Ministry threshold. Immediate intervention required to prevent exam lockout.'
          : 'Attendance is safely above the required Ministry threshold. Keep up the consistent check-ins!'}
      </p>
    </div>
  );
}