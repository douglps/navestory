import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
import { QueryProvider } from "@/lib/query/providers";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ServiceWorkerUpdateListener } from "@/components/pwa/service-worker-update-listener";
import { AppToastViewport } from "@/components/layout/app-toast-viewport";
import "./globals.css";

// @spec SPEC-20260712-001 RF-01
export const metadata: Metadata = {
  title: "Nave",
  description: "Gestão inteligente de veículos",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Nave",
  },
};

// @spec SPEC-20260729-002 — recalculado para a direção Prata (era o azul pré-Prata #3b70ca);
// mesmo hex do primary light usado em manifest.ts.
export const viewport: Viewport = {
  themeColor: "#1B3A6B",
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    // @spec SPEC-20260721-001 RF-03 — `suppressHydrationWarning`: o next-themes injeta a
    // classe `.dark` no <html> antes da hidratação para evitar flash de tema errado, o que
    // difere do HTML renderizado no servidor por design (recomendação oficial da lib).
    <html lang="pt-BR" suppressHydrationWarning>
      <body>
        {/*
          @spec SPEC-20260712-001 RF-05, RF-14
          `reloadOnOnline={false}`: o Serwist recarregaria a página sozinho ao recuperar
          conexão por padrão — desligado porque RNF-07 proíbe qualquer reload automático sem
          interação. `disable` em dev evita cachear HMR (comportamento equivalente ao antigo
          plugin de webpack).
        */}
        <ThemeProvider>
          <SerwistProvider
            swUrl="/serwist/sw.js"
            reloadOnOnline={false}
            disable={process.env.NODE_ENV === "development"}
          >
            <QueryProvider>{children}</QueryProvider>
            <ServiceWorkerUpdateListener />
          </SerwistProvider>
          <AppToastViewport />
        </ThemeProvider>
      </body>
    </html>
  );
}
