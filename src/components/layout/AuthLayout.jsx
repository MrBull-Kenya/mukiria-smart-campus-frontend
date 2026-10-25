import React from 'react';
import { Outlet } from 'react-router-dom';
import Logo from '../Logo';

// Shared by /login and every /auth/* page, so the institute logo appears on all of them.
export default function AuthLayout() {
  return (
    <div className="flex min-h-screen flex-col bg-gradient-to-br from-blue-50 via-white to-slate-100 p-4">
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md space-y-5 rounded-3xl border border-white/80 bg-white/80 p-5 shadow-xl shadow-blue-950/[0.06] backdrop-blur-sm sm:p-8">
          <div className="text-center space-y-2">
            <Logo size={104} />
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-700">Mukiria Technical Training Institute</p>
          </div>
          <Outlet />
        </div>
      </main>
      <footer className="pt-4 text-center text-xs text-gray-500">
        © 2026 BullSoft Technologies. All rights reserved.
      </footer>
    </div>
  );
}
