import React from 'react';

export default function LateBadge({ status = 'present' }) {
  // status: 'present', 'late', 'absent'
  const config = {
    present: { bg: 'bg-emerald-100 text-emerald-800 border-emerald-200', dot: 'bg-emerald-500', label: 'Present' },
    late: { bg: 'bg-amber-100 text-amber-800 border-amber-200', dot: 'bg-amber-500', label: 'Late' },
    absent: { bg: 'bg-rose-100 text-rose-800 border-rose-200', dot: 'bg-rose-500', label: 'Absent' },
  };

  const current = config[status] || config.present;

  return (
    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full border text-xs font-bold ${current.bg}`}>
      <span className={`w-2 h-2 rounded-full ${current.dot} animate-pulse`} />
      <span>{current.label}</span>
    </div>
  );
}