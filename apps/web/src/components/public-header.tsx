"use client";

import Link from "next/link";
import { useTheme } from "next-themes";
import { ThemeToggle } from "@nave/ui";
import { useEffect, useState, type ReactNode } from "react";

interface PublicHeaderProps {
  navLink?: { label: string; href: string };
}

/**
 * @spec SPEC-20260731-004 RF-01, RF-02, RF-13
 */
export function PublicHeader({ navLink }: PublicHeaderProps): ReactNode {
  const { resolvedTheme, setTheme } = useTheme();
  // `next-themes` só sabe o tema real depois de ler `localStorage`/`matchMedia` no cliente —
  // no SSR `resolvedTheme` é sempre `undefined`. Renderizar o ThemeToggle condicionado a esse
  // valor antes do mount causaria hydration mismatch (mesmo padrão de `layout/header.tsx`).
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <header className="flex h-14 w-full items-center justify-between gap-3 border-b border-border px-4">
      <div className="flex items-center gap-3">
        <Link href="/" className="text-base font-semibold text-foreground">
          Nave
        </Link>
        {navLink && (
          <Link href={navLink.href} className="text-sm underline">
            {navLink.label}
          </Link>
        )}
      </div>
      {mounted ? (
        <ThemeToggle
          theme={resolvedTheme === "dark" ? "dark" : "light"}
          onToggle={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        />
      ) : (
        <span aria-hidden="true" className="h-9 w-9 rounded-md" />
      )}
    </header>
  );
}
