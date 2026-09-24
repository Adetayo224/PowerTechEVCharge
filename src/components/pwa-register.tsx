"use client";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { RefreshCw } from "lucide-react";

export function PwaRegister() {
  const [waiting, setWaiting] = useState<ServiceWorker | null>(null);
  const [autoReloadIn, setAutoReloadIn] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    let registration: ServiceWorkerRegistration | null = null;
    let pollTimer: ReturnType<typeof setInterval> | null = null;

    const attachInstallingListener = (reg: ServiceWorkerRegistration) => {
      const installing = reg.installing;
      if (!installing) return;
      installing.addEventListener("statechange", () => {
        if (installing.state === "installed" && navigator.serviceWorker.controller) {
          setWaiting(installing);
        }
      });
    };

    (async () => {
      try {
        registration = await navigator.serviceWorker.register("/sw.js", { updateViaCache: "none" });

        // If there is already a waiting worker on first load, offer it.
        if (registration.waiting && navigator.serviceWorker.controller) {
          setWaiting(registration.waiting);
        }
        if (registration.installing) attachInstallingListener(registration);
        registration.addEventListener("updatefound", () => {
          if (registration) attachInstallingListener(registration);
        });

        // Check for updates on every page load and every 60 seconds.
        try { await registration.update(); } catch {}
        pollTimer = setInterval(() => { registration?.update().catch(() => {}); }, 60_000);
      } catch (e) {
        console.warn("[sw] register failed", e);
      }
    })();

    // When the new SW takes control, reload so every tab is on the fresh assets.
    let reloading = false;
    const onControllerChange = () => {
      if (reloading) return;
      reloading = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    // Also re-check whenever the tab becomes visible again.
    const onVisible = () => {
      if (document.visibilityState === "visible") registration?.update().catch(() => {});
    };
    document.addEventListener("visibilitychange", onVisible);

    return () => {
      if (pollTimer) clearInterval(pollTimer);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, []);

  // 5-second auto-reload once we know a new version is waiting.
  useEffect(() => {
    if (!waiting) return;
    setAutoReloadIn(5);
    const tick = setInterval(() => {
      setAutoReloadIn((n) => (n === null ? null : Math.max(0, n - 1)));
    }, 1000);
    const timeout = setTimeout(() => activate(), 5000);
    return () => { clearInterval(tick); clearTimeout(timeout); };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [waiting]);

  function activate() {
    if (!waiting) return;
    // Ask the waiting worker to skip waiting; the controllerchange handler above
    // reloads the tab once it takes over.
    waiting.postMessage({ type: "SKIP_WAITING" });
  }

  return (
    <AnimatePresence>
      {waiting && (
        <motion.div
          initial={{ y: 80, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 80, opacity: 0 }}
          transition={{ type: "spring", stiffness: 320, damping: 30 }}
          className="fixed inset-x-0 z-[60] flex justify-center px-4"
          style={{ bottom: "calc(env(safe-area-inset-bottom, 0px) + 96px)" }}
          role="status"
          aria-live="polite"
        >
          <div className="max-w-md w-full float px-4 py-3 flex items-center gap-3">
            <div className="h-9 w-9 rounded-full bg-[var(--primary-soft)] flex items-center justify-center flex-shrink-0">
              <RefreshCw className="h-4 w-4 text-[var(--primary)]" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-semibold truncate">A new version of PlugSpot is ready</div>
              <div className="text-[11px] text-[var(--muted-foreground)]">
                {autoReloadIn !== null && autoReloadIn > 0
                  ? `Reloading in ${autoReloadIn}s`
                  : "Reloading…"}
              </div>
            </div>
            <button
              onClick={activate}
              className="btn-primary rounded-xl h-9 px-3 text-sm font-semibold"
            >
              Update
            </button>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
