import { useEffect, useState } from 'react';

// Registers the service worker (production builds only, so `npm run dev` never serves stale files).
export function registerServiceWorker() {
  if (!import.meta.env.PROD || !('serviceWorker' in navigator)) return;
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => { /* the app still works without it */ });
  });
}

// The browser's "install this app" prompt arrives once, early; keep it until the user asks to install.
let deferredPrompt = null;
const listeners = new Set();
const notify = () => listeners.forEach((fn) => fn());

if (typeof window !== 'undefined') {
  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    notify();
  });
  window.addEventListener('appinstalled', () => {
    deferredPrompt = null;
    notify();
  });
}

export function isStandalone() {
  return window.matchMedia?.('(display-mode: standalone)').matches || window.navigator.standalone === true;
}

function isIos() {
  const ua = window.navigator.userAgent;
  return /iphone|ipad|ipod/i.test(ua) || (ua.includes('Macintosh') && navigator.maxTouchPoints > 1);
}

// How this device can install the app:
// 'prompt' (Android/desktop Chrome, Edge…), 'ios' (Share → Add to Home Screen), 'installed', or null.
export function useInstall() {
  const [, setTick] = useState(0);
  useEffect(() => {
    const fn = () => setTick((n) => n + 1);
    listeners.add(fn);
    return () => listeners.delete(fn);
  }, []);

  let mode = null;
  if (isStandalone()) mode = 'installed';
  else if (deferredPrompt) mode = 'prompt';
  else if (isIos()) mode = 'ios';

  const install = async () => {
    if (!deferredPrompt) return false;
    const prompt = deferredPrompt;
    deferredPrompt = null;
    prompt.prompt();
    const { outcome } = await prompt.userChoice;
    notify();
    return outcome === 'accepted';
  };

  return { mode, install };
}
