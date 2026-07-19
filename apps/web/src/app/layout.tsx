import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { SerwistProvider } from "@serwist/turbopack/react";
import { QueryProvider } from "@/lib/query/providers";
import { ServiceWorkerUpdateToast } from "@/components/pwa/service-worker-update-toast";
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

export const viewport: Viewport = {
  themeColor: "#3b70ca",
};

export default function RootLayout({ children }: { children: ReactNode }): ReactNode {
  return (
    <html lang="pt-BR">
      <body>
        {/*
          @spec SPEC-20260712-001 RF-05, RF-14
          `reloadOnOnline={false}`: o Serwist recarregaria a página sozinho ao recuperar
          conexão por padrão — desligado porque RNF-07 proíbe qualquer reload automático sem
          interação. `disable` em dev evita cachear HMR (comportamento equivalente ao antigo
          plugin de webpack).
        */}
        <SerwistProvider
          swUrl="/serwist/sw.js"
          reloadOnOnline={false}
          disable={process.env.NODE_ENV === "development"}
        >
          <QueryProvider>{children}</QueryProvider>
          <ServiceWorkerUpdateToast />
        </SerwistProvider>
      </body>
    </html>
  );
}
