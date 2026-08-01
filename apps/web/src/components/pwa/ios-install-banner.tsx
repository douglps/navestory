"use client";

import { useEffect, useState, type ReactNode } from "react";
import { isIosInstallable } from "@/lib/pwa/platform-detection";

const DISMISSED_KEY = "navestory-ios-install-banner-dismissed";

/**
 * Banner de instrução manual para Safari iOS/iPadOS (sem `beforeinstallprompt`). Exibido uma
 * vez por sessão — não repete se o usuário já dispensou (`sessionStorage`).
 *
 * @spec SPEC-20260712-001 RF-04
 */
export function IosInstallBanner(): ReactNode {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!isIosInstallable()) return;
    if (typeof window === "undefined") return;
    if (window.sessionStorage.getItem(DISMISSED_KEY) === "1") return;
    setVisible(true);
  }, []);

  function dismiss(): void {
    setVisible(false);
    window.sessionStorage.setItem(DISMISSED_KEY, "1");
  }

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-4 left-4 z-[150] flex items-center gap-3 rounded-md border border-border bg-card px-4 py-3 text-sm shadow-lg"
    >
      <span>
        Instale o navestory: toque em 📤 Compartilhar e depois em
        &quot;Adicionar à Tela de Início&quot;.
      </span>
      <button
        type="button"
        aria-label="Dispensar"
        onClick={dismiss}
        className="text-muted-foreground hover:text-foreground"
      >
        ×
      </button>
    </div>
  );
}
