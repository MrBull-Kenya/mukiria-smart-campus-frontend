import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import api, { getErrorMessage } from '../services/api';
import { useFetch } from '../hooks/useFetch';
import { Icon } from './ui';

const readKey = (id) => `mtt_notif_read_${id}`;
const loadRead = (id) => { try { return new Set(JSON.parse(localStorage.getItem(readKey(id)) || '[]')); } catch { return new Set(); } };
const saveRead = (id, set) => { try { localStorage.setItem(readKey(id), JSON.stringify([...set].slice(-200))); } catch { /* storage full/blocked: just not remembered */ } };
const base64UrlToBytes = (value) => {
  const padded = `${value}${'='.repeat((4 - (value.length % 4)) % 4)}`;
  const base64 = padded.replace(/-/g, '+').replace(/_/g, '/');
  const raw = window.atob(base64);
  return Uint8Array.from(raw, (character) => character.charCodeAt(0));
};

const TONE = { warn: 'border-amber-200 bg-amber-50', ok: 'border-emerald-200 bg-emerald-50', info: 'border-gray-200 bg-white' };

// What the background notification button shows: unsupported | insecure | default | denied | granted-on | granted-off
export const ALERT_LABEL = {
  default: 'Enable background notifications',
  'granted-on': 'Turn background notifications off',
  'granted-off': 'Turn background notifications on',
};

// The dropdown's content, kept free of data fetching so it is easy to test.
export function NotificationPanel({ items, readIds, alertsState, loading, error, pushMessage, pushBusy, onOpenItem, onMarkAll, onToggleAlerts }) {
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
        {ALERT_LABEL[alertsState] && <button type="button" disabled={pushBusy} onClick={onToggleAlerts} className="font-bold text-gray-700 hover:text-blue-600 disabled:opacity-50">{pushBusy ? 'Updating notification settings…' : ALERT_LABEL[alertsState]}</button>}
        {alertsState === 'denied' && <span>Notifications are blocked in your browser's site settings.</span>}
        {alertsState === 'insecure' && <span>Background notifications need a secure (HTTPS) address.</span>}
        {alertsState === 'unsupported' && <span>This browser does not support background push notifications.</span>}
        {pushMessage && <p role="alert" className="mt-2 text-rose-700">{pushMessage}</p>}
        <p className="mt-2">Push alerts can arrive while the app is closed. Your browser and device must allow notifications; iPhone and iPad require the app to be added to the Home Screen.</p>
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
  const [alertsOn, setAlertsOn] = useState(false);
  const [perm, setPerm] = useState(() => (typeof Notification === 'undefined' ? 'unsupported' : Notification.permission));
  const [pushMessage, setPushMessage] = useState('');
  const [pushBusy, setPushBusy] = useState(false);
  const box = useRef(null);
  const seen = useRef(null);

  const items = state.data?.items || [];
  const unread = items.filter((i) => !read.has(i.id));
  const secure = typeof window === 'undefined' || window.isSecureContext !== false;
  const pushSupported = typeof Notification !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window;
  const alertsState = !pushSupported ? 'unsupported' : !secure ? 'insecure' : perm === 'granted' ? (alertsOn ? 'granted-on' : 'granted-off') : perm;

  useEffect(() => {
    if (!pushSupported || !secure) return undefined;
    let cancelled = false;
    navigator.serviceWorker.ready
      .then(async (registration) => {
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) await api.post('/push/subscriptions', subscription.toJSON());
        return !!subscription;
      })
      .then((subscribed) => {
        if (!cancelled) {
          setAlertsOn(subscribed);
          setPerm(Notification.permission);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setAlertsOn(false);
          setPushMessage(err?.message || getErrorMessage(err, 'Could not sync this device notification subscription.'));
        }
        console.warn('Could not sync push subscription:', err);
      });
    return () => { cancelled = true; };
  }, [pushSupported, secure, user.id]);

  // Foreground alert for items that arrive AFTER the page loaded (never for existing items), and only
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
    setPushBusy(true);
    setPushMessage('');
    try {
      if (alertsOn) {
        const registration = await navigator.serviceWorker.ready;
        const subscription = await registration.pushManager.getSubscription();
        if (subscription) {
          await api.delete('/push/subscriptions', { data: { endpoint: subscription.endpoint } });
          await subscription.unsubscribe();
        }
        setAlertsOn(false);
        return;
      }

      let permission = Notification.permission;
      if (permission === 'default') permission = await Notification.requestPermission();
      setPerm(permission);
      if (permission !== 'granted') {
        if (permission === 'denied') setPushMessage("Notifications are blocked. Allow them in your browser's site settings, then try again.");
        return;
      }

      const { data } = await api.get('/push/vapid-public-key');
      if (!data.enabled || !data.publicKey) {
        throw new Error('Background notifications are not configured on the server yet.');
      }

      const registration = await navigator.serviceWorker.register('/sw.js');
      const subscription = await registration.pushManager.getSubscription() || await registration.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: base64UrlToBytes(data.publicKey),
      });
      await api.post('/push/subscriptions', subscription.toJSON());
      setAlertsOn(true);
      showAlert({ id: 'welcome', title: 'Background notifications enabled', text: 'Campus updates can now reach this device while the app is closed.' });
    } catch (err) {
      setPushMessage(err?.message || getErrorMessage(err, 'Could not update background notification settings.'));
    } finally {
      setPushBusy(false);
    }
  };

  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={toggle} aria-label={`Notifications${unread.length ? `, ${unread.length} unread` : ''}`} aria-expanded={open}
        className="group relative flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-blue-800 shadow-sm transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600">
        <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-50 transition-colors group-hover:bg-blue-100">
          <Icon name="notifications" className="h-4 w-4" />
        </span>
        {unread.length > 0 && <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center bg-rose-600 text-white text-[10px] font-bold rounded-full">{unread.length > 99 ? '99+' : unread.length}</span>}
      </button>
      {open && (
        <div className="absolute right-0 mt-2 w-[22rem] max-w-[92vw] z-30">
          <NotificationPanel items={items} readIds={read} alertsState={alertsState} loading={state.loading} error={state.error} pushMessage={pushMessage} pushBusy={pushBusy}
            onOpenItem={(i) => { markRead([i.id]); setOpen(false); }} onMarkAll={() => markRead(items.map((i) => i.id))} onToggleAlerts={toggleAlerts} />
        </div>
      )}
    </div>
  );
}
