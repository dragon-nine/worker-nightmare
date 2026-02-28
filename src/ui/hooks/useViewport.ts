import { useSyncExternalStore } from 'react';

export type ViewportMode = 'desktop' | 'tablet' | 'mobile';

const DESKTOP_QUERY = '(min-width: 1024px)';
const TABLET_QUERY = '(min-width: 600px) and (max-width: 1023px)';

function getMode(): ViewportMode {
  if (window.matchMedia(DESKTOP_QUERY).matches) return 'desktop';
  if (window.matchMedia(TABLET_QUERY).matches) return 'tablet';
  return 'mobile';
}

let cachedMode = getMode();

function subscribe(callback: () => void) {
  const mqDesktop = window.matchMedia(DESKTOP_QUERY);
  const mqTablet = window.matchMedia(TABLET_QUERY);

  const handler = () => {
    cachedMode = getMode();
    callback();
  };

  mqDesktop.addEventListener('change', handler);
  mqTablet.addEventListener('change', handler);

  return () => {
    mqDesktop.removeEventListener('change', handler);
    mqTablet.removeEventListener('change', handler);
  };
}

function getSnapshot() {
  return cachedMode;
}

export function useViewport(): ViewportMode {
  return useSyncExternalStore(subscribe, getSnapshot, () => 'mobile' as ViewportMode);
}
