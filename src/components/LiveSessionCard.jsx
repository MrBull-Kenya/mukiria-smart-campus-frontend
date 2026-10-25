import React from 'react';
import { Card } from './ui';

export default function LiveSessionCard({ session, className = '' }) {
  if (!session) return null;

  return (
    <Card className={`overflow-hidden border-emerald-200 bg-gradient-to-r from-emerald-50 to-white ${className}`}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex min-w-0 items-start gap-3">
          <span className="mt-0.5 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-sm" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 7.5A2.5 2.5 0 0 1 6.5 5h11A2.5 2.5 0 0 1 20 7.5v9a2.5 2.5 0 0 1-2.5 2.5h-11A2.5 2.5 0 0 1 4 16.5zM8 3v4m8-4v4M8 12h8m-8 3h5" />
            </svg>
          </span>
          <div className="min-w-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-extrabold uppercase tracking-wide text-emerald-800">
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-emerald-600" />
              Live session
            </span>
            <h2 className="mt-1 truncate text-sm font-extrabold text-slate-900">{session.unit}</h2>
            <p className="mt-0.5 text-xs text-slate-600">
              Started {session.startedAt} EAT
              {session.lecturer ? ` · ${session.lecturer}` : ''}
              {session.venue ? ` · ${session.venue}` : ''}
            </p>
          </div>
        </div>
        <div className="rounded-xl border border-emerald-100 bg-white/80 px-3 py-2 text-center">
          <p className="text-lg font-extrabold tabular-nums text-emerald-800">{session.checkedIn}</p>
          <p className="text-[10px] font-semibold text-slate-500">checked in</p>
        </div>
      </div>
    </Card>
  );
}
