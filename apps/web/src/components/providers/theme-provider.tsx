"use client";

import { ThemeProvider as NextThemesProvider } from "next-themes";
import type { ReactNode } from "react";

/**
 * @spec SPEC-20260721-001 RF-03
 * `defaultTheme="system"` + `enableSystem`: primeiro acesso segue `prefers-color-scheme` do
 * SO (US-03). Preferência manual do usuário (toggle) persiste em localStorage e sobrepõe o
 * SO em sessões futuras — comportamento nativo do `next-themes`, sem lógica adicional.
 * `attribute="class"` aplica/remove `.dark` no `<html>`, consumido por `tailwind.config.ts`
 * (`darkMode: "class"`) e pelos overrides `.dark` em `globals.css`.
 */
export function ThemeProvider({ children }: { children: ReactNode }): ReactNode {
  return (
    <NextThemesProvider attribute="class" defaultTheme="system" enableSystem>
      {children}
    </NextThemesProvider>
  );
}
