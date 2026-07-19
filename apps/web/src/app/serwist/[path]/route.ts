import { createSerwistRoute } from "@serwist/turbopack";

/**
 * Compila e serve o Service Worker (`src/app/sw.ts`) via route handler — abordagem
 * compatível com Turbopack (padrão de build do Next.js 16 neste projeto), diferente do
 * antigo plugin de webpack do Serwist v8. Serve em `/serwist/sw.js` (referenciado por
 * `SerwistProvider` em `layout.tsx`).
 *
 * @spec SPEC-20260712-001 RF-05
 */
export const { dynamic, dynamicParams, revalidate, generateStaticParams, GET } =
  createSerwistRoute({
    swSrc: "src/app/sw.ts",
  });
