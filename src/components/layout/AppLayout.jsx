import React, { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useOfflineSync } from '../../hooks/useOfflineSync';
import InstallButton from '../InstallButton';
import NotificationBell from '../NotificationBell';
import { NAV_BY_ROLE } from '../../config/navigation';
import { roleLabel } from '../../config/campus';
import { Icon } from '../ui';

function OfflineStatusBar() {
  const { isOnline, pendingCount, syncing, rejected } = useOfflineSync();
  if (isOnline && pendingCount === 0 && rejected.length === 0) return null;

  let cls = 'bg-amber-500';
  let text = `Back online: ${pendingCount} queued item(s) waiting to sync`;
  if (!isOnline) {
    cls = 'bg-rose-600';
    text = `You are offline. Biometric attendance check-in requires an internet connection.${pendingCount ? ` ${pendingCount} queued item(s) are waiting to sync.` : ''}`;
  } else if (syncing) {
    text = 'Syncing queued items with the server…';
  } else if (pendingCount === 0) {
    cls = 'bg-slate-700';
    text = `${rejected.length} queued item(s) could not be synced. Review offline sync for details.`;
  }

  return <div role={isOnline ? 'status' : 'alert'} className={`${cls} px-4 py-2.5 text-center text-xs font-semibold text-white`}>{text}</div>;
}

export default function AppLayout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const links = NAV_BY_ROLE[user.role] || [];

  useEffect(() => {
    setMobileNavOpen(false);
  }, [location.pathname]);

  const handleLogout = () => {
    logout();
    navigate('/login', { replace: true });
  };
  const closeMobileNav = () => setMobileNavOpen(false);

  return (
    <div className="flex min-h-screen flex-col bg-slate-50 font-sans">
      <OfflineStatusBar />
      <header className="app-shell-header sticky top-0 z-20 border-t-4 border-blue-600 border-b border-slate-200 bg-white shadow-sm shadow-slate-900/[0.03] print:hidden">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img src="/icons/icon-192.png" alt="" className="w-9 h-9 rounded-lg shrink-0" />
            <div className="min-w-0">
              <p className="truncate text-sm font-extrabold tracking-tight text-blue-800">MTTI Smart Campus</p>
              <p className="text-[11px] text-gray-500 truncate">
                {user.name} · {roleLabel(user.role)}{user.class_code ? ` · ${user.class_code}` : ''}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1.5 sm:gap-2">
            <InstallButton />
            <NotificationBell />
            <NavLink to="/profile" aria-label="Open your profile" title="Profile" className="flex h-9 w-9 items-center justify-center rounded-full border border-blue-200 bg-blue-50 text-sm font-black text-blue-700 hover:bg-blue-100">
              {user.name?.trim()?.charAt(0)?.toUpperCase() || '👤'}
            </NavLink>
            <button onClick={handleLogout} className="flex h-9 items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 text-xs font-bold text-slate-600 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 sm:px-3">
              <span className="hidden sm:inline">Log out</span>
              <span className="sm:hidden">Exit</span>
            </button>
            <button
              type="button"
              aria-label={mobileNavOpen ? 'Close navigation menu' : 'Open navigation menu'}
              aria-expanded={mobileNavOpen}
              aria-controls="primary-navigation"
              onClick={() => setMobileNavOpen((open) => !open)}
              className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-700 transition hover:bg-blue-50 hover:text-blue-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 md:hidden"
            >
              <Icon name={mobileNavOpen ? 'close' : 'menu'} className="h-5 w-5" />
            </button>
          </div>
        </div>
        <nav id="primary-navigation" aria-label="Main navigation" className={`${mobileNavOpen ? 'grid' : 'hidden'} mx-auto max-w-6xl grid-cols-2 gap-1.5 px-4 pb-3 md:flex md:overflow-x-auto md:pb-2`}>
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              onClick={closeMobileNav}
              end={l.to === '/dashboard' || l.to.endsWith('/dashboard')}
              className={({ isActive }) =>
                `whitespace-nowrap rounded-lg px-3 py-2 text-xs font-bold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 ${
                  isActive ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-600 hover:bg-blue-50 hover:text-blue-700'
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
      <footer className="app-shell-footer mt-6 border-t border-slate-200 bg-white px-4 py-4 text-center text-xs text-slate-500 print:hidden">
        © 2026 BullSoft Technologies. All rights reserved.
      </footer>
    </div>
  );
}
