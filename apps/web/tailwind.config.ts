import typography from "@tailwindcss/typography";
import type { Config } from "tailwindcss";

// @spec SPEC-20260525-001 §4.1
// Fonte de verdade dos valores de cor é `packages/ui/src/tokens/colors.ts` — este arquivo só
// referencia as variáveis CSS geradas em `globals.css` a partir dela (`oklch(var(--x) /
// <alpha-value>)` permite modificador de opacidade do Tailwind, ex: `bg-primary/50`).
const config: Config = {
  // @spec SPEC-20260721-001 RF-03 — next-themes aplica/remove a classe `.dark` no <html>;
  // `darkMode: "class"` faz o Tailwind gerar variantes `dark:` a partir dela.
  darkMode: "class",
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}", "../../packages/ui/src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        background: "oklch(var(--background) / <alpha-value>)",
        foreground: "oklch(var(--foreground) / <alpha-value>)",
        card: {
          DEFAULT: "oklch(var(--card) / <alpha-value>)",
          foreground: "oklch(var(--card-foreground) / <alpha-value>)",
        },
        border: "oklch(var(--border) / <alpha-value>)",
        muted: {
          DEFAULT: "oklch(var(--muted) / <alpha-value>)",
          foreground: "oklch(var(--muted-foreground) / <alpha-value>)",
        },
        primary: {
          DEFAULT: "oklch(var(--primary) / <alpha-value>)",
          foreground: "oklch(var(--primary-foreground) / <alpha-value>)",
        },
        secondary: {
          DEFAULT: "oklch(var(--secondary) / <alpha-value>)",
          foreground: "oklch(var(--secondary-foreground) / <alpha-value>)",
        },
        accent: {
          DEFAULT: "oklch(var(--accent) / <alpha-value>)",
          foreground: "oklch(var(--accent-foreground) / <alpha-value>)",
        },
        // @spec SPEC-20260721-001 RF-01
        gold: {
          DEFAULT: "oklch(var(--gold) / <alpha-value>)",
          foreground: "oklch(var(--gold-foreground) / <alpha-value>)",
        },
        success: {
          DEFAULT: "oklch(var(--success) / <alpha-value>)",
          foreground: "oklch(var(--success-foreground) / <alpha-value>)",
          pastel: "oklch(var(--success-pastel) / <alpha-value>)",
        },
        warning: {
          DEFAULT: "oklch(var(--warning) / <alpha-value>)",
          foreground: "oklch(var(--warning-foreground) / <alpha-value>)",
          pastel: "oklch(var(--warning-pastel) / <alpha-value>)",
        },
        danger: {
          DEFAULT: "oklch(var(--danger) / <alpha-value>)",
          foreground: "oklch(var(--danger-foreground) / <alpha-value>)",
          pastel: "oklch(var(--danger-pastel) / <alpha-value>)",
        },
        info: {
          DEFAULT: "oklch(var(--info) / <alpha-value>)",
          foreground: "oklch(var(--info-foreground) / <alpha-value>)",
          pastel: "oklch(var(--info-pastel) / <alpha-value>)",
        },
        // @spec SPEC-20260721-002 RF-04
        surface: {
          DEFAULT: "oklch(var(--surface) / <alpha-value>)",
          elevated: "oklch(var(--surface-elevated) / <alpha-value>)",
        },
        "on-surface": {
          DEFAULT: "oklch(var(--on-surface) / <alpha-value>)",
          muted: "oklch(var(--on-surface-muted) / <alpha-value>)",
          subtle: "oklch(var(--on-surface-subtle) / <alpha-value>)",
        },
        // @spec SPEC-20260729-002 RF-02 — substitui `chart.1..5`; ver globals.css para o racional
        categorical: {
          1: "oklch(var(--categorical-1) / <alpha-value>)",
          2: "oklch(var(--categorical-2) / <alpha-value>)",
          3: "oklch(var(--categorical-3) / <alpha-value>)",
          4: "oklch(var(--categorical-4) / <alpha-value>)",
          5: "oklch(var(--categorical-5) / <alpha-value>)",
        },
        chart: {
          grid: "oklch(var(--chart-grid) / <alpha-value>)",
        },
        // @spec SPEC-20260729-002 RF-03
        urgency: {
          hot: "oklch(var(--urgency-hot) / <alpha-value>)",
          "hot-pastel": "oklch(var(--urgency-hot-pastel) / <alpha-value>)",
        },
        finance: {
          outgoing: "oklch(var(--finance-outgoing) / <alpha-value>)",
        },
      },
      borderRadius: {
        sm: "var(--radius-sm)",
        md: "var(--radius-md)",
        lg: "var(--radius-lg)",
      },
      spacing: {
        touch: "var(--spacing-touch-target)",
      },
    },
  },
  plugins: [typography],
};

export default config;
