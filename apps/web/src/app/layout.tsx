import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { Inter } from "next/font/google";
import { SerwistProvider } from "@serwist/turbopack/react";
import { QueryProvider } from "@/lib/query/providers";
import { ThemeProvider } from "@/components/providers/theme-provider";
import { ServiceWorkerUpdateListener } from "@/components/pwa/service-worker-update-listener";
import { AppToastViewport } from "@/components/layout/app-toast-viewport";
import "./globals.css";

// @spec SPEC-20260731-001 RF-06 — Inter única e variável, substitui a fonte default do SO.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });

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

// @spec SPEC-20260731-001 RF-02 — recalculado para a direção Azul-Índigo (era o azul-prata de
// Prata, #1B3A6B); mesmo hex do primary light usado em manifest.ts.
export const viewport: Viewport = {
  themeColor: "#004FB5",
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    // @spec SPEC-20260721-001 RF-03 — `suppressHydrationWarning`: o next-themes injeta a
    // classe `.dark` no <html> antes da hidratação para evitar flash de tema errado, o que
    // difere do HTML renderizado no servidor por design (recomendação oficial da lib).
    <html lang="pt-BR" className={inter.variable} suppressHydrationWarning>
      {/* @spec SPEC-20260731-001 RF-02 — bg-background/text-foreground aplicados no <body>: sem
          isso, nenhuma rota (pública ou autenticada) tinha um fundo/texto base ligado aos
          tokens de tema — o navegador caía no branco/preto default do Preflight em vez do
          grafite Azul-Índigo, mais visível em telas com pouco conteúdo (landing, /termos). */}
      <body className="bg-background text-foreground">
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
