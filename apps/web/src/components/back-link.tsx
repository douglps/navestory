"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import type { MouseEvent, ReactNode } from "react";

interface BackLinkProps {
  fallback: string;
  label?: string;
  className?: string;
}

/**
 * @spec SPEC-20260731-004 RF-11
 * Sem JS, funciona como um `<Link>` estático para `fallback`. Com JS, tenta `router.back()`
 * quando há histórico de navegação na aba atual.
 */
export function BackLink({
  fallback,
  label = "Voltar",
  className,
}: BackLinkProps): ReactNode {
  const router = useRouter();

  function handleClick(event: MouseEvent<HTMLAnchorElement>): void {
    if (window.history.length > 1) {
      event.preventDefault();
      router.back();
    }
  }

  return (
    <Link
      href={fallback}
      onClick={handleClick}
      className={className ?? "text-sm text-muted-foreground underline"}
    >
      {label}
    </Link>
  );
}
