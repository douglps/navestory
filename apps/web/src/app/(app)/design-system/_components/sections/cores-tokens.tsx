import { Section, Subsection } from "../section-shell";
import { GRAPHITE_SCALE, INDIGO_SCALE, PROPOSED_TOKENS, tokenDark, tokenLight, UNCHANGED_ROLES } from "../../_lib/tokens";
import type { ScopeMode } from "../design-system-scope";

function Swatch({ oklch, label, sub }: { oklch: string; label: string; sub?: string }) {
  return (
    <div className="overflow-hidden rounded-md border border-border">
      <div className="h-14 w-full" style={{ backgroundColor: `oklch(${oklch})` }} />
      <div className="bg-card p-2 text-xs">
        <p className="font-semibold">{label}</p>
        <p className="font-mono text-muted-foreground">{oklch}</p>
        {sub && <p className="mt-0.5 text-muted-foreground">{sub}</p>}
      </div>
    </div>
  );
}

export function CoresTokensSection({ mode }: { mode: ScopeMode }) {
  return (
    <Section
      title="Cores & Tokens"
      description="Arquitetura em 3 camadas (proposta §4): primitivos → semânticos → componente. O Nave ainda não tem tokens de componente — a expansão de packages/ui/ deve criá-los via CVA quando o mesmo valor aparecer em ≥3 lugares."
    >
      <Subsection title="Camada 1 — Primitivos: escala tonal Azul-Índigo (H≈250)">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-6">
          {INDIGO_SCALE.map((stop) => (
            <Swatch key={stop.tone} oklch={stop.oklch} label={`indigo-${stop.tone}`} sub={stop.use} />
          ))}
        </div>
      </Subsection>

      <Subsection title="Camada 1 — Primitivos: escala de grafite (neutro dedicado, independente do azul)">
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-5">
          {GRAPHITE_SCALE.map((stop) => (
            <Swatch key={stop.tone} oklch={stop.oklch} label={`graphite-${stop.tone}`} sub={stop.use} />
          ))}
        </div>
      </Subsection>

      <Subsection title="Camada 2 — Semânticos: papéis que mudam nesta proposta">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {Object.entries(PROPOSED_TOKENS).map(([role, value]) => (
            <Swatch key={role} oklch={mode === "dark" ? value.dark : value.light} label={role} sub={value.note} />
          ))}
        </div>
      </Subsection>

      <Subsection title="Camada 2 — Semânticos: papéis inalterados (herdados de produção)">
        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          {UNCHANGED_ROLES.map((role) => (
            <Swatch
              key={role}
              oklch={mode === "dark" ? tokenDark(role) : tokenLight(role)}
              label={role}
              sub="inalterado — mesmo valor de produção"
            />
          ))}
        </div>
      </Subsection>

      <Subsection title="Camada 3 — Componente">
        <p className="text-sm text-muted-foreground">
          Ainda não existe nenhum token de componente no Nave. Criado apenas quando o mesmo valor aparece em
          ≥3 lugares dentro do componente, via <code className="text-foreground">class-variance-authority</code>{" "}
          — não como variável CSS solta.
        </p>
      </Subsection>

      <Subsection title="Regra de degradê (proposta para R-DS-08)">
        <p className="text-sm text-muted-foreground">
          Permitido apenas em áreas sem texto direto sobreposto — cabeçalho decorativo, fundo de ilustração,
          preenchimento sob linha de gráfico. Sempre entre tons adjacentes da MESMA escala (nunca índigo →
          verde). O fundo de página em si é sempre grafite sólido, nunca o degradê.
        </p>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Permitido — degradê indigo-80 → indigo-50, sem texto sobreposto</p>
            <div
              className="h-20 rounded-md border border-border"
              style={{ background: "linear-gradient(135deg, oklch(80% 0.06 250), oklch(50% 0.18 250))" }}
            />
          </div>
          <div>
            <p className="mb-1 text-xs text-muted-foreground">Proibido — degradê entre matizes diferentes (índigo → verde), ilustrativo</p>
            <div
              className="h-20 rounded-md border border-dashed border-danger opacity-60"
              style={{ background: "linear-gradient(135deg, oklch(70% 0.10 250), oklch(60% 0.15 150))" }}
            />
          </div>
        </div>
      </Subsection>
    </Section>
  );
}
