import React, { useEffect, useRef, useState } from 'react';
import { Icon } from './ui';

const isStandalone = () => typeof window !== 'undefined' && (window.matchMedia?.('(display-mode: standalone)')?.matches || window.navigator?.standalone === true);

// What to tell someone when the browser can't show its install prompt by itself
export function installHelp({ secure, ios }) {
  if (!secure) return ['Browsers only let a site be installed as an app from a secure (HTTPS) address, and this portal is open over plain HTTP.', 'Ask your Administrator to serve it over HTTPS. Until then it works fine in the browser.'];
  if (ios) return ['In Safari, tap the Share button (the square with an arrow).', 'Choose "Add to Home Screen", then tap Add.'];
  return ['Open your browser menu (⋮ or ⋯) and choose "Install app" or "Add to Home screen".', "Don't see it? The app may already be installed, or this browser can't install apps."];
}

// "Install app": one tap with the browser's own prompt when available, otherwise short instructions. Hidden once installed.
export default function InstallButton() {
  const [deferred, setDeferred] = useState(null);
  const [installed, setInstalled] = useState(isStandalone);
  const [help, setHelp] = useState(false);
  const box = useRef(null);

  useEffect(() => {
    const onPrompt = (e) => { e.preventDefault(); setDeferred(e); };
    const onInstalled = () => { setInstalled(true); setDeferred(null); setHelp(false); };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => { window.removeEventListener('beforeinstallprompt', onPrompt); window.removeEventListener('appinstalled', onInstalled); };
  }, []);

  useEffect(() => {
    if (!help) return undefined;
    const onDown = (e) => { if (!box.current?.contains(e.target)) setHelp(false); };
    document.addEventListener('mousedown', onDown);
    return () => document.removeEventListener('mousedown', onDown);
  }, [help]);

  if (installed) return null;

  const click = async () => {
    if (!deferred) return setHelp((h) => !h);
    try {
      await deferred.prompt();
      const choice = await deferred.userChoice;
      setDeferred(null);
      if (choice?.outcome === 'accepted') setInstalled(true);
    } catch {
      setHelp(true);
      setDeferred(null);
    }
  };

  const steps = installHelp({ secure: typeof window === 'undefined' || window.isSecureContext !== false, ios: typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '') });
  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={click} aria-label="Install the app" aria-expanded={help} aria-controls="install-help"
        className="group inline-flex h-10 items-center gap-2 rounded-xl border border-blue-200 bg-gradient-to-r from-blue-700 to-blue-600 px-2.5 text-xs font-extrabold text-white shadow-sm shadow-blue-900/15 transition hover:from-blue-800 hover:to-blue-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-600 focus-visible:ring-offset-2">
        <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-white/15 text-white ring-1 ring-inset ring-white/20 transition group-hover:bg-white/20"><Icon name="install" className="h-4 w-4" /></span>
        <span className="hidden sm:inline">Add to device</span>
      </button>
      {help && (
        <div id="install-help" className="absolute right-0 z-30 mt-2 w-80 max-w-[92vw] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xl shadow-slate-900/15" role="dialog" aria-label="How to install">
          <div className="bg-gradient-to-r from-blue-800 to-blue-600 px-4 py-3 text-white">
            <p className="text-sm font-extrabold">MTTI Smart Campus</p>
            <p className="mt-0.5 text-[11px] text-blue-100">Install for quick access from your device</p>
          </div>
          <div className="space-y-3 p-4">
            {steps.map((s, index) => (
              <div key={s} className="flex items-start gap-2.5">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-50 text-[10px] font-extrabold text-blue-700">{index + 1}</span>
                <p className="text-xs leading-5 text-slate-600">{s}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
