"use client";

import { useState } from "react";
import { Checkbox } from "@navestory/ui";
import { Section, Subsection } from "../section-shell";
import { PROPOSED_TOKENS, tokenDark, tokenLight } from "../../_lib/tokens";
import { contrastRatio, wcagLevel } from "../../_lib/contrast";

const CHECKLIST = [
  "Texto corpo (≥14px regular / ≥18px bold): razão ≥ 4.5:1 (AA), incluindo muted-foreground sobre background",
  "Texto grande e elementos gráficos de UI significativos: razão ≥ 3:1",
  "warning/success usados como fundo de texto (sobre -pastel), nunca como texto direto sobre o canvas — C-DS-01",
  "Anel de foco visível com razão ≥ 3:1 contra o fundo adjacente (SC 1.4.11)",
  "Todo elemento interativo expõe :focus-visible com outline ≥2px",
  "Modais/drawers implementam focus trap com retorno ao trigger ao fechar",
  "Área de toque ≥ 24×24 CSS px (AA), preferencialmente ≥ 44×44 px mobile-first",
  "prefers-reduced-motion: reduce desativa pulse do Skeleton e transições decorativas",
  "Estados dinâmicos (loading/error/sucesso) anunciados via aria-live ou role=status",
  "Switch/Checkbox expõem aria-checked corretamente",
];

const PAIRS: { label: string; mode: "light" | "dark" }[] = [
  { label: "primary / background", mode: "light" },
  { label: "primary / background", mode: "dark" },
  { label: "secondary / background", mode: "light" },
  { label: "secondary / background", mode: "dark" },
  { label: "muted-foreground / background", mode: "light" },
  { label: "muted-foreground / background", mode: "dark" },
];

function resolvePair(label: string, mode: "light" | "dark"): [string, string] {
  const bg =
    mode === "dark"
      ? PROPOSED_TOKENS.background.dark
      : PROPOSED_TOKENS.background.light;
  if (label.startsWith("primary"))
    return [
      mode === "dark"
        ? PROPOSED_TOKENS.primary.dark
        : PROPOSED_TOKENS.primary.light,
      bg,
    ];
  if (label.startsWith("secondary"))
    return [
      mode === "dark"
        ? PROPOSED_TOKENS.secondary.dark
        : PROPOSED_TOKENS.secondary.light,
      bg,
    ];
  return [
    mode === "dark"
      ? tokenDark("mutedForeground")
      : tokenLight("mutedForeground"),
    bg,
  ];
}

export function AcessibilidadeSection() {
  const [checked, setChecked] = useState<Record<number, boolean>>({});

  return (
    <Section
      title="Acessibilidade"
      description="Checklist da proposta §10 e contraste calculado ao vivo (mesmo motor de packages/ui/src/tokens) para os pares que a direção Azul-Índigo introduz."
    >
      <Subsection title="Contraste ao vivo — pares novos">
        <div className="overflow-x-auto rounded-md border border-border">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border bg-card text-left text-muted-foreground">
                <th className="p-2 font-medium">Par</th>
                <th className="p-2 font-medium">Modo</th>
                <th className="p-2 font-medium">Razão</th>
                <th className="p-2 font-medium">Nível</th>
              </tr>
            </thead>
            <tbody>
              {PAIRS.map(({ label, mode }) => {
                const [a, b] = resolvePair(label, mode);
                const ratio = contrastRatio(`oklch(${a})`, `oklch(${b})`);
                const level = wcagLevel(ratio);
                return (
                  <tr
                    key={`${label}-${mode}`}
                    className="border-b border-border last:border-0"
                  >
                    <td className="p-2">{label}</td>
                    <td className="p-2 text-muted-foreground">{mode}</td>
                    <td className="p-2 tabular-nums">{ratio.toFixed(2)}:1</td>
                    <td className="p-2">
                      <span
                        className="rounded-sm px-1.5 py-0.5 text-xs font-semibold"
                        style={{
                          backgroundColor:
                            level === "Falha"
                              ? "oklch(var(--danger-pastel))"
                              : "oklch(var(--success-pastel))",
                          color: "oklch(var(--foreground))",
                        }}
                      >
                        {level}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-muted-foreground">
          Pendência C-DS-01 (contraste warning/success sobre o canvas geral)
          permanece em aberto — não é resolvida por esta direção, apenas
          referenciada.
        </p>
      </Subsection>

      <Subsection title="Checklist (proposta §10)">
        <ul className="flex flex-col gap-2">
          {CHECKLIST.map((item, index) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <Checkbox
                // eslint-disable-next-line security/detect-object-injection -- index é índice numérico do próprio map, não input externo
                checked={Boolean(checked[index])}
                onChange={(e) =>
                  setChecked((current) => ({
                    ...current,
                    [index]: e.target.checked,
                  }))
                }
                className="mt-0.5"
              />
              <span
                className={
                  // eslint-disable-next-line security/detect-object-injection -- index é índice numérico do próprio map, não input externo
                  checked[index] ? "text-muted-foreground line-through" : ""
                }
              >
                {item}
              </span>
            </li>
          ))}
        </ul>
      </Subsection>
    </Section>
  );
}
