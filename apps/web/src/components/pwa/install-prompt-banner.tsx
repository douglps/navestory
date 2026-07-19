"use client";

import { useState, type ReactNode } from "react";
import { useInstallPrompt } from "@/lib/pwa/use-install-prompt";

/**
 * CTA de instalação para Chrome/Edge (Android e desktop) — só aparece após a 2ª visita e
 * enquanto o `beforeinstallprompt` estiver disponível. Banner discreto, dismissível.
 *
 * @spec SPEC-20260712-001 RF-03
 */
export function InstallPromptBanner(): ReactNode {
  const { canInstall, promptInstall } = useInstallPrompt();
  const [dismissed, setDismissed] = useState(false);

  if (!canInstall || dismissed) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[150] flex items-center gap-3 rounded-md border border-neutral-200 bg-white px-4 py-3 text-sm shadow-lg dark:border-neutral-700 dark:bg-neutral-900"
    >
      <span>Instale o Nave para acesso rápido e uso offline.</span>
      <button
        type="button"
        onClick={() => promptInstall()}
        className="rounded-md bg-[#3b70ca] px-3 py-1.5 text-sm font-medium text-white hover:opacity-90"
      >
        Instalar app
      </button>
      <button
        type="button"
        aria-label="Dispensar"
        onClick={() => setDismissed(true)}
        className="text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        ×
      </button>
    </div>
  );
}
