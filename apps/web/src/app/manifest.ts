import type { MetadataRoute } from "next";

// @spec SPEC-20260712-001 RF-01, RF-02
// @spec SPEC-20260731-001 RF-02 — recalculado para a direção Azul-Índigo (era o azul-prata de
// Prata, #1B3A6B). Primary light oklch(44% 0.19 250) = #004FB5, Background light
// oklch(97.0% 0.003 265) = #F4F5F7 (grafite dedicado, ver colors.ts) — conversão sRGB↔OKLab
// padrão (Björn Ottosson).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "navestory — Gestão Inteligente de Veículos",
    short_name: "navestory",
    description: "Gestão inteligente de veículos, despesas e manutenções.",
    start_url: "/",
    display: "standalone",
    background_color: "#F4F5F7",
    theme_color: "#004FB5",
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
