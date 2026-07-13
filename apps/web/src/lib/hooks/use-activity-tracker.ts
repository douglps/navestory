"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef } from "react";

const IDLE_TIMEOUT_MS = 30 * 60 * 1000;
const REFRESH_THRESHOLD_MS = 5 * 60 * 1000;
const CHECK_INTERVAL_MS = 30_000;
const ACTIVITY_EVENTS = ["click", "keypress", "scroll", "touchstart", "wheel"] as const;

export interface UseActivityTrackerOptions {
  expiresAt: Date | null;
  onIdle: () => void;
  onRefresh: () => void;
  idleTimeoutMs?: number;
}

/**
 * @spec SPEC-20260524-001 §2, STORY-07a
 * Idle timeout de 30min sem interação; renovação silenciosa quando o access token
 * expira em <5min e houve atividade recente.
 */
export function useActivityTracker(options: UseActivityTrackerOptions): void {
  const { expiresAt, onIdle, onRefresh, idleTimeoutMs = IDLE_TIMEOUT_MS } = options;
  const lastActivityRef = useRef(Date.now());
  const pathname = usePathname();

  useEffect(() => {
    lastActivityRef.current = Date.now();
  }, [pathname]);

  useEffect(() => {
    const registerActivity = () => {
      lastActivityRef.current = Date.now();
    };

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, registerActivity);
    }
    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, registerActivity);
      }
    };
  }, []);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const idleFor = now - lastActivityRef.current;

      if (idleFor >= idleTimeoutMs) {
        onIdle();
        return;
      }

      if (expiresAt && expiresAt.getTime() - now < REFRESH_THRESHOLD_MS) {
        onRefresh();
      }
    }, CHECK_INTERVAL_MS);

    return () => clearInterval(interval);
  }, [expiresAt, idleTimeoutMs, onIdle, onRefresh]);
}
