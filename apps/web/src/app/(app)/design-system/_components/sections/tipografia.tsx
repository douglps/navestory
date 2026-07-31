import { Section, Subsection } from "../section-shell";

const SCALE = [
  { token: "text-xs", size: "11px", lh: "1.5", weight: "400", use: "Labels de campo, metadados" },
  { token: "text-sm", size: "13px", lh: "1.45", weight: "400/500", use: "Corpo de tabela, badges" },
  { token: "text-base", size: "15px", lh: "1.5", weight: "400", use: "Corpo padrão, parágrafos" },
  { token: "text-md", size: "18px", lh: "1.4", weight: "500", use: "Subtítulos de seção" },
  { token: "text-lg", size: "22px", lh: "1.3", weight: "600", use: "Título de página" },
  { token: "text-xl", size: "26px", lh: "1.25", weight: "700", use: "KPI principal" },
  { token: "text-2xl", size: "32px", lh: "1.2", weight: "700", use: "Display de destaque" },
];

export function TipografiaSection() {
  return (
    <Section
      title="Tipografia"
      description="Inter, família única variável (100-900) — cobre tnum/cv03/cv04 nativamente. Escala modular razão 1.2. Hoje inexistente formalmente no produto (Tailwind default)."
    >
      <Subsection title="Escala modular">
        <div className="flex flex-col gap-3">
          {SCALE.map((row) => (
            <div key={row.token} className="flex flex-wrap items-baseline gap-3 border-b border-border pb-3 last:border-0">
              <span
                style={{ fontSize: row.size, lineHeight: row.lh, fontWeight: Number(row.weight.split("/")[0]) }}
              >
                Custo por km este mês
              </span>
              <span className="ml-auto shrink-0 text-xs text-muted-foreground">
                {row.token} · {row.size} / {row.lh} · peso {row.weight} — {row.use}
              </span>
            </div>
          ))}
        </div>
      </Subsection>

      <Subsection title="Regra obrigatória de tabular-nums">
        <p className="text-sm text-muted-foreground">
          Toda célula de tabela, KPI, contador, valor monetário e leitura de odômetro deve declarar{" "}
          <code className="text-foreground">font-variant-numeric: tabular-nums</code>. Sem isso, dígitos de
          largura proporcional quebram alinhamento vertical em listas de valores.
        </p>
        <div className="grid gap-2 sm:grid-cols-2">
          <div className="rounded-md border border-border p-3">
            <p className="mb-1 text-xs text-muted-foreground">Sem tabular-nums (desalinhado)</p>
            <div className="flex flex-col text-lg font-semibold">
              <span>R$ 1.284,90</span>
              <span>R$ 111,00</span>
              <span>R$ 45.230,10</span>
            </div>
          </div>
          <div className="rounded-md border border-border p-3">
            <p className="mb-1 text-xs text-muted-foreground">Com tabular-nums (alinhado)</p>
            <div className="flex flex-col text-lg font-semibold tabular-nums">
              <span>R$ 1.284,90</span>
              <span>R$ 111,00</span>
              <span>R$ 45.230,10</span>
            </div>
          </div>
        </div>
      </Subsection>

      <Subsection title="Pesos">
        <p className="text-sm text-muted-foreground">
          400 (corpo), 500 (ênfase leve/interativo), 600 (label, badge), 700 (heading, KPI). Evitar 300 em
          texto funcional — legibilidade cai em telas de baixa resolução.
        </p>
        <div className="flex flex-wrap gap-4">
          {[400, 500, 600, 700].map((weight) => (
            <span key={weight} style={{ fontWeight: weight }} className="text-base">
              Peso {weight}
            </span>
          ))}
        </div>
      </Subsection>
    </Section>
  );
}
