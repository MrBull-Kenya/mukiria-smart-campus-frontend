import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useFetch } from '../hooks/useFetch';

const readKey = (id) => `mtt_notif_read_${id}`;
const alertsKey = (id) => `mtt_notif_alerts_${id}`;
const loadRead = (id) => { try { return new Set(JSON.parse(localStorage.getItem(readKey(id)) || '[]')); } catch { return new Set(); } };
const saveRead = (id, set) => { try { localStorage.setItem(readKey(id), JSON.stringify([...set].slice(-200))); } catch { /* storage full/blocked: just not remembered */ } };

const TONE = { warn: 'border-amber-200 bg-amber-50', ok: 'border-emerald-200 bg-emerald-50', info: 'border-gray-200 bg-white' };

// What the "desktop alerts" button shows: unsupported | insecure | default | denied | granted-on | granted-off
export const ALERT_LABEL = {
  default: '🔔 Turn on desktop alerts',
  'granted-on': '🔕 Turn desktop alerts off',
  'granted-off': '🔔 Turn desktop alerts on',
};

// The dropdown's content, kept free of data fetching so it is easy to test.
export function NotificationPanel({ items, readIds, alertsState, loading, error, onOpenItem, onMarkAll, onToggleAlerts }) {
  const unread = items.filter((i) => !readIds.has(i.id)).length;
  return (
    <div className="bg-white border border-gray-200 rounded-2xl shadow-xl overflow-hidden" role="dialog" aria-label="Notifications">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <p className="text-sm font-black text-gray-900">Notifications{unread ? ` (${unread} new)` : ''}</p>
        <button type="button" onClick={onMarkAll} disabled={unread === 0} className="text-[11px] font-bold text-blue-600 underline disabled:text-gray-300 disabled:no-underline">Mark all read</button>
      </div>
      <div className="max-h-[22rem] overflow-y-auto divide-y divide-gray-100">
        {error && <p className="p-4 text-xs text-rose-600">{error}</p>}
        {!error && loading && items.length === 0 && <p className="p-4 text-xs text-gray-500">Loading…</p>}
        {!error && !loading && items.length === 0 && <p className="p-6 text-center text-sm text-gray-500">You're all caught up 🎉</p>}
        {items.map((i) => {
          const isNew = !readIds.has(i.id);
          return (
            <Link key={i.id} to={i.link} onClick={() => onOpenItem(i)} className={`flex gap-3 px-4 py-3 border-l-4 hover:brightness-95 transition ${TONE[i.kind] || TONE.info} ${isNew ? '' : 'opacity-60'}`}>
              <span className="text-xl leading-none pt-0.5">{i.icon}</span>
              <span className="min-w-0 flex-1">
                <span className={`block text-xs text-gray-900 ${isNew ? 'font-black' : 'font-semibold'}`}>{i.title}</span>
                <span className="block text-[11px] text-gray-600 break-words">{i.text}</span>
                {i.when && <span className="block text-[10px] text-gray-400 mt-0.5">{i.when}</span>}
              </span>
              {isNew && <span className="w-2 h-2 rounded-full bg-blue-600 mt-1.5 shrink-0" aria-label="new" />}
            </Link>
          );
        })}
      </div>
      <div className="px-4 py-2.5 border-t border-gray-100 bg-gray-50 text-[11px] text-gray-500">
        {ALERT_LABEL[alertsState] && <button type="button" onClick={onToggleAlerts} className="font-bold text-gray-700 hover:text-blue-600">{ALERT_LABEL[alertsState]}</button>}
        {alertsState === 'denied' && <span>Desktop alerts are blocked in your browser's site settings.</span>}
        {alertsState === 'insecure' && <span>Desktop alerts need a secure (HTTPS) address.</span>}
        {alertsState === 'unsupported' && <span>This browser can't show desktop alerts.</span>}
      </div>
    </div>
  );
}

function showAlert(item) {
  try {
    const opts = { body: item.text, icon: '/icons/icon-192.png', tag: item.id };
    if (navigator.serviceWorker?.controller) navigator.serviceWorker.ready.then((r) => r.showNotification(item.title, opts));
    else { const n = new Notification(item.title, opts); n.onclick = () => { window.focus(); n.close(); }; }
  } catch { /* alerts are a bonus; the bell still works */ }
}

export default function NotificationBell() {
  const { user } = useAuth();
  const state = useFetch('/notifications', { pollMs: 60000 });
  const [open, setOpen] = useState(false);
  const [read, setRead] = useState(() => loadRead(user.id));
  const [alertsOn, setAlertsOn] = useState(() => { try { return localStorage.getItem(alertsKey(user.id)) !== 'off'; } catch { return true; } });
  const [perm, setPerm] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const box = useRef(null);
  const seen = useRef(null);

  const items = state.data?.items || [];
  const unread = items.filter((i) => !read.has(i.id));
  const secure = typeof window === 'undefined' || window.isSecureContext !== false;
  const alertsState = perm === 'unsupported' ? 'unsupported' : !secure ? 'insecure' : perm === 'granted' ? (alertsOn ? 'granted-on' : 'granted-off') : perm;

  // Desktop alert for things that appear AFTER the page loaded (never for what was already there), and only
  // when the person isn't looking at the page
  useEffect(() => {
    if (!state.data) return;
    if (seen.current === null) { seen.current = new Set(items.map((i) => i.id)); return; }
    const fresh = items.filter((i) => !seen.current.has(i.id) && !read.has(i.id));
    items.forEach((i) => seen.current.add(i.id));
    if (fresh.length && perm === 'granted' && alertsOn && secure && (document.hidden || !document.hasFocus())) fresh.slice(0, 3).forEach(showAlert);
  }, [state.data]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!open) return undefined;
    const onDown = (e) => { if (!box.current?.contains(e.target)) setOpen(false); };
    const onKey = (e) => { if (e.key === 'Escape') setOpen(false); };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => { document.removeEventListener('mousedown', onDown); document.removeEventListener('keydown', onKey); };
  }, [open]);

  const markRead = (ids) => { const next = new Set(read); ids.forEach((id) => next.add(id)); setRead(next); saveRead(user.id, next); };
  const toggle = () => { if (!open) state.reload(true); setOpen((o) => !o); };
  const toggleAlerts = async () => {
    if (perm === 'default') {
      const p = await Notification.requestPermission();
      setPerm(p);
      if (p === 'granted') { try { localStorage.setItem(alertsKey(user.id), 'on'); } catch { /* ignore */ } setAlertsOn(true); showAlert({ id: 'welcome', title: 'Desktop alerts are on', text: "You'll be told here when something needs your attention." }); }
    } else if (perm === 'granted') {
      const next = !alertsOn; setAlertsOn(next);
      try { localStorage.setItem(alertsKey(user.id), next ? 'on' : 'off'); } catch { /* ignore */ }
    }
  };

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={toggle} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`} aria-expanded={open}
        className="relative w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 hover:bg-gray-50 text-lg transition">
        🔔
        {unread.length > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-rose-600 text-white text-[10px] font-bold rounded-full">{unread.length > 99 ? '99+' : unread.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[92vw] z-30">
          <NotificationPanel items={items} readIds={read} alertsState={alertsState} loading={state.loading} error={state.error}
            onOpenItem={(i) => { markRead([i.id]); setOpen(false); }} onMarkAll={() => markRead(items.map((i) => i.id))} onToggleAlerts={toggleAlerts} />
        </div>
      )}
    </div>
  );
}
