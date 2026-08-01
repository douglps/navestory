"use client";

import type { ReactNode } from "react";
import { ToastViewport } from "@navestory/ui";
import { useUIStore } from "@/lib/stores/ui-store";

/** @spec SPEC-20260525-001 §8.2 — conecta a fila de toasts do ui-store ao `<ToastViewport />`. */
export function AppToastViewport(): ReactNode {
  const toasts = useUIStore((state) => state.toasts);
  const dismissToast = useUIStore((state) => state.dismissToast);

  return <ToastViewport toasts={toasts} onDismiss={dismissToast} />;
}
