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
      className="fixed bottom-4 left-4 z-[150] flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-lg"
    >
      <span>Instale o Nave para acesso rápido e uso offline.</span>
      <button
        type="button"
        onClick={() => promptInstall()}
        className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
      >
        Instalar app
      </button>
      <button
        type="button"
        aria-label="Dispensar"
        onClick={() => setDismissed(true)}
        className="text-muted-foreground hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}
