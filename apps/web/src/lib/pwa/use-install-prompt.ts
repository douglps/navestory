"use client";

import { useEffect, useState } from "react";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed"; platform: string }>;
}

const VISIT_COUNT_KEY = "navestory-pwa-visit-count";
const MIN_VISITS_FOR_PROMPT = 2;

/**
 * Captura `beforeinstallprompt` (Chrome/Edge) o mais cedo possível — se o evento disparar
 * antes do listener estar pronto, o CTA simplesmente não aparece nessa sessão, sem erro
 * visível (EC-07, limitação aceita pela spec). O prompt nativo só é mostrado após a 2ª
 * visita (RF-03), contada via `localStorage` (persiste entre sessões, ao contrário de
 * `sessionStorage`).
 *
 * @spec SPEC-20260712-001 RF-03
 */
export function useInstallPrompt(): {
  canInstall: boolean;
  promptInstall: () => Promise<void>;
} {
  const [deferredPrompt, setDeferredPrompt] =
    useState<BeforeInstallPromptEvent | null>(null);
  const [pastFirstVisit, setPastFirstVisit] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;

    try {
      const raw = window.localStorage.getItem(VISIT_COUNT_KEY);
      const count = (raw ? Number.parseInt(raw, 10) : 0) + 1;
      window.localStorage.setItem(VISIT_COUNT_KEY, String(count));
      setPastFirstVisit(count >= MIN_VISITS_FOR_PROMPT);
    } catch {
      // localStorage indisponível (modo privado etc.) — CTA simplesmente não aparece.
    }

    function handleBeforeInstallPrompt(event: Event): void {
      event.preventDefault();
      setDeferredPrompt(event as BeforeInstallPromptEvent);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    return () =>
      window.removeEventListener(
        "beforeinstallprompt",
        handleBeforeInstallPrompt,
      );
  }, []);

  async function promptInstall(): Promise<void> {
    if (!deferredPrompt) return;
    await deferredPrompt.prompt();
    await deferredPrompt.userChoice;
    setDeferredPrompt(null);
  }

  return {
    canInstall: pastFirstVisit && deferredPrompt !== null,
    promptInstall,
  };
}
