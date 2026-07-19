import type { MetadataRoute } from "next";

// @spec SPEC-20260712-001 RF-01, RF-02
// Paleta Nave (.agents/nave-ui-pwa/SKILL.md): Primary oklch(0.556 0.15 260) ≈ #3b70ca,
// Background oklch(0.985 0 0) ≈ #fafafa.
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Nave — Gestão Inteligente de Veículos",
    short_name: "Nave",
    description: "Gestão inteligente de veículos, despesas e manutenções.",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#3b70ca",
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
