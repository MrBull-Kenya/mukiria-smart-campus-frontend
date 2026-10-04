import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import { NAV_BY_ROLE } from '../../config/navigation';
import { roleLabel } from '../../config/campus';

function OfflineStatusBar() {
  const { isOnline, pendingCount, syncing, rejected } = useOfflineSync();
  if (isOnline && pendingCount === 0 && rejected.length === 0) return null;

  let cls = 'bg-amber-500';
  let text = `☁️ Back online: ${pendingCount} offline record(s) waiting to sync`;
  if (!isOnline) { cls = 'bg-rose-600'; text = `⚠️ You are offline. ${pendingCount ? `${pendingCount} scan(s) saved on this phone.` : 'Scans will be saved on this phone and synced later.'}`; }
  else if (syncing) { text = '🔄 Syncing offline records with the server...'; }
  else if (pendingCount === 0) { cls = 'bg-gray-700'; text = `${rejected.length} offline record(s) were rejected by the server.`; }

  return <div className={`${cls} p-2 text-center text-xs font-bold text-white`}>{text}</div>;
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const links = NAV_BY_ROLE[user.role] || [];

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col font-sans">
      <OfflineStatusBar />
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-lg shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-black text-gray-900 truncate">MTTI Smart Campus</p>
              <p className="text-[11px] text-gray-500 truncate">
                {user.name} · {roleLabel(user.role)}{user.class_code ? ` · ${user.class_code}` : ''}
              </p>
            </div>
          </div>
          <button onClick={handleLogout} className="text-xs font-bold text-rose-600 border border-rose-200 rounded-lg px-3 py-1.5 hover:bg-rose-50 transition shrink-0">
            Log out
          </button>
        </div>
        <nav className="max-w-6xl mx-auto px-4 pb-2 flex gap-1 overflow-x-auto">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              className={({ isActive }) =>
                `whitespace-nowrap text-xs font-bold px-3 py-1.5 rounded-lg transition ${
                  isActive ? 'bg-blue-600 text-white' : 'text-gray-600 hover:bg-gray-100'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </nav>
      </header>
      <main className="flex-1 w-full max-w-6xl mx-auto">
        <Outlet />
      </main>
    </div>
  );
}
