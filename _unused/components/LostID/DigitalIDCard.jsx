import React from 'react';

export default function DigitalIDCard({ student = { name: "Purity Kainyu", adm: "12154", course: "ITech / Mod IV", classCode: "ITECH6/S/24/J/M/25" } }) {
  return (
    <div className="bg-gradient-to-br from-blue-900 via-indigo-900 to-slate-900 text-white p-6 rounded-2xl shadow-xl max-w-sm mx-auto space-y-6 relative overflow-hidden border border-blue-800">
      <div className="absolute -right-10 -bottom-10 w-40 h-40 bg-blue-500/10 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex justify-between items-start">
        <div>
          <h4 className="text-[10px] tracking-widest uppercase text-blue-300 font-semibold">Mukiria Technical Training Institute</h4>
          <h2 className="text-lg font-extrabold tracking-tight">Official Student ID</h2>
        </div>
        <span className="text-[10px] bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded font-mono font-bold">VERIFIED</span>
      </div>

      {/* Body / Details */}
      <div className="flex items-center space-x-4">
        <div className="w-20 h-20 rounded-xl bg-gradient-to-tr from-blue-600 to-indigo-500 border-2 border-white/20 flex items-center justify-center font-bold text-2xl shadow-inner">
          {student.name.charAt(0)}
        </div>
        <div className="space-y-1">
          <h3 className="text-base font-bold leading-tight">{student.name}</h3>
          <p className="text-xs text-blue-200 font-mono">ADM: {student.adm}</p>
          <p className="text-[11px] text-gray-300">{student.course}</p>
        </div>
      </div>

      {/* QR & Footer */}
      <div className="bg-white/10 backdrop-blur-md p-4 rounded-xl border border-white/10 flex items-center justify-between">
        <div className="space-y-0.5">
          <p className="text-[10px] text-blue-300 font-medium">Class Group</p>
          <p className="text-xs font-mono font-bold">{student.classCode}</p>
          <p className="text-[9px] text-gray-400 mt-1">Scan for biometric check-in</p>
        </div>
        <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center text-gray-900 font-mono text-[9px] text-center p-1 font-bold">
          [QR CODE]
        </div>
      </div>
    </div>
  );
}