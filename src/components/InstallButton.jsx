import React, { useEffect, useRef, useState } from 'react';

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
    deferred.prompt();
    const choice = await deferred.userChoice;
    setDeferred(null);
    if (choice?.outcome === 'accepted') setInstalled(true);
  };

  const steps = installHelp({ secure: typeof window === 'undefined' || window.isSecureContext !== false, ios: typeof navigator !== 'undefined' && /iphone|ipad|ipod/i.test(navigator.userAgent || '') });
  return (
    <div className="relative" ref={box}>
      <button type="button" onClick={click} aria-label="Install the app" aria-expanded={help}
        className="h-9 flex items-center gap-1.5 px-2.5 rounded-lg border border-blue-200 bg-blue-50 text-blue-700 text-xs font-bold hover:bg-blue-100 transition">
        <span aria-hidden="true">⬇</span><span className="hidden sm:inline">Install app</span>
      </button>
      {help && (
        <div className="absolute right-0 mt-2 w-72 max-w-[92vw] z-30 bg-white border border-gray-200 rounded-2xl shadow-xl p-4 space-y-2" role="dialog" aria-label="How to install">
          <p className="text-sm font-black text-gray-900">Install MTTI Smart Campus</p>
          {steps.map((s) => <p key={s} className="text-xs text-gray-600">{s}</p>)}
        </div>
      )}
    </div>
  );
}
