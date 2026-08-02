import { useEffect, useRef } from "react"

// Keeps the screen awake while `active` is true. Fails silently when the
// Screen Wake Lock API is unsupported or a request is rejected (e.g. low
// battery mode) — the screen just follows its normal timeout in that case.
export function useWakeLock(active: boolean): void {
  const sentinelRef = useRef<WakeLockSentinel | null>(null)

  useEffect(() => {
    if (!active || !("wakeLock" in navigator)) return

    let cancelled = false

    async function acquire() {
      try {
        const sentinel = await navigator.wakeLock.request("screen")
        if (cancelled) {
          sentinel.release()
        } else {
          sentinelRef.current = sentinel
        }
      } catch {
        // Unsupported or denied — no-op.
      }
    }

    acquire()

    function handleVisibilityChange() {
      if (document.visibilityState === "visible" && !sentinelRef.current) {
        acquire()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      cancelled = true
      document.removeEventListener("visibilitychange", handleVisibilityChange)
      sentinelRef.current?.release()
      sentinelRef.current = null
    }
  }, [active])
}
