'use client';
import { useEffect, useRef } from 'react';
export function OrbitalVisual() {
  const host = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const media = matchMedia('(min-width: 1024px) and (prefers-reduced-motion: no-preference)');
    const device = navigator as Navigator & {
      deviceMemory?: number;
      connection?: { saveData?: boolean };
    };
    if (
      !media.matches ||
      device.connection?.saveData ||
      (device.deviceMemory && device.deviceMemory < 4)
    )
      return;
    let cancelled = false;
    let dispose: (() => void) | undefined;
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      observer.disconnect();
      void import('./orbital-renderer')
        .then(async ({ mountOrbit }) => {
          if (cancelled) return;
          dispose = await mountOrbit(el);
          if (cancelled) dispose?.();
        })
        .catch(() => {});
    });
    observer.observe(el);
    return () => {
      cancelled = true;
      observer.disconnect();
      dispose?.();
    };
  }, []);
  return (
    <div ref={host} className="orbital-visual" aria-hidden="true">
      <img src="/assets/orbit.webp" alt="" width="640" height="640" />
    </div>
  );
}
