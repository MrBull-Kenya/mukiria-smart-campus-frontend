import React from 'react';
import { Outlet } from 'react-router-dom';
import Logo from '../Logo';

// Shared by /login and every /auth/* page, so the institute logo appears on all of them.
export default function AuthLayout() {
  return (
    <div className="min-h-screen flex flex-col p-4 bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <main className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-md space-y-5">
          <div className="text-center space-y-2">
            <Logo size={104} />
            <p className="text-[11px] font-bold uppercase tracking-widest text-blue-900">Mukiria Technical Training Institute</p>
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
