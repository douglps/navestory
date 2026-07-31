import type { MetadataRoute } from "next";

// @spec SPEC-20260712-001 RF-01, RF-02
// @spec SPEC-20260729-002 — recalculado para a direção Prata (era o azul pré-Prata #3b70ca).
// Primary light oklch(35.3% 0.093 259) = #1B3A6B, Background light oklch(97.2% 0.003 248) =
// #F4F6F8 — hex-fonte já documentados em SPEC-20260729-001 (não reconvertidos).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nave — Gestão Inteligente de Veículos",
    short_name: "Nave",
    description: "Gestão inteligente de veículos, despesas e manutenções.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F6F8",
    theme_color: "#1B3A6B",
    icons: [
      {
        src: "/icons/icon-192-any.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-any.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-192-maskable.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
