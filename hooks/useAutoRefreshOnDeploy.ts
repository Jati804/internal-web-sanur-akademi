import { useEffect, useRef } from 'react';

// Sesuaikan kalau interval mau lebih cepat/lambat. 3 menit itu cukup aman —
// nggak terlalu sering nge-fetch index.html, tapi tetap kerasa "cepat" buat user.
const CHECK_INTERVAL_MS = 3 * 60 * 1000;

// Vite default nyimpen hasil build JS di folder /assets/*.js dengan hash unik
// tiap build. Kalau vite.config.ts kamu custom-in build.assetsDir, sesuaikan
// pola regex-nya di bawah.
const ASSET_SRC_PATTERN = /src="([^"]+\/assets\/[^"]+\.js)"/g;

function getCurrentScriptPaths(): string[] {
  return Array.from(document.scripts)
    .map((s) => s.src)
    .filter((src) => src.includes('/assets/'))
    .map((src) => {
      try {
        return new URL(src).pathname;
      } catch {
        return src;
      }
    });
}

function isUserTyping(): boolean {
  const el = document.activeElement as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || el.isContentEditable;
}

/**
 * Pasang sekali di root component (misal App.tsx):
 *
 *   useAutoRefreshOnDeploy();
 *
 * Cara kerja:
 * 1. Pas app pertama kali load, dicatat file JS mana yang lagi jalan.
 * 2. Tiap beberapa menit (dan tiap tab balik aktif), fetch ulang index.html
 *    dan bandingin nama file JS di dalamnya sama yang lagi jalan sekarang.
 * 3. Kalau beda (berarti ada deploy baru), tandain "ada update nunggu".
 * 4. Reload cuma dieksekusi kalau user lagi NGGAK fokus di input/textarea —
 *    biar nggak motong isian form yang lagi diketik. Kalau lagi ngetik,
 *    dia nunggu sampai user klik keluar dari field itu (blur), baru reload.
 */
export function useAutoRefreshOnDeploy() {
  const initialPaths = useRef<string[] | null>(null);
  const updatePending = useRef(false);

  useEffect(() => {
    initialPaths.current = getCurrentScriptPaths();

    const tryReloadIfSafe = () => {
      if (updatePending.current && !isUserTyping()) {
        window.location.reload();
      }
    };

    const checkForUpdate = async () => {
      try {
        const res = await fetch('/', { cache: 'no-store' });
        const html = await res.text();
        const found = Array.from(html.matchAll(ASSET_SRC_PATTERN)).map((m) => m[1]);

        if (found.length === 0 || !initialPaths.current) return;

        const isDifferent =
          JSON.stringify([...found].sort()) !==
          JSON.stringify([...initialPaths.current].sort());

        if (isDifferent) {
          updatePending.current = true;
          tryReloadIfSafe(); // langsung coba, siapa tau lagi nggak ngetik apa-apa
        }
      } catch {
        // Gagal cek (misal lagi offline) — diemin aja, coba lagi di interval berikutnya.
      }
    };

    const interval = setInterval(checkForUpdate, CHECK_INTERVAL_MS);

    // Begitu user klik keluar dari input manapun, cek lagi kalau ada update yang nunggu.
    document.addEventListener('focusout', tryReloadIfSafe);

    // Cek juga pas tab balik keliatan (misal user sempat pindah tab).
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') checkForUpdate();
    };
    document.addEventListener('visibilitychange', handleVisibility);

    return () => {
      clearInterval(interval);
      document.removeEventListener('focusout', tryReloadIfSafe);
      document.removeEventListener('visibilitychange', handleVisibility);
    };
  }, []);
}
