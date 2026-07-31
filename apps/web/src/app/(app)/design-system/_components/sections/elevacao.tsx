import { Card, Tooltip } from "@nave/ui";
import { Section, Subsection } from "../section-shell";

export function ElevacaoSection() {
  return (
    <Section
      title="Elevação & Superfícies"
      description="Elevação não é sombra pesada — é variação de luminosidade da própria escala tonal (Calm UI). Sombra é reservada a elementos flutuantes de verdade (popover, dropdown, modal, toast) — nunca a cards estáticos na grade."
    >
      <Subsection title="surface-0 / surface-1 / surface-2">
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-md border border-border bg-background p-4">
            <p className="text-xs font-semibold text-muted-foreground">surface-0 — base</p>
            <p className="mt-1 text-sm">Fundo de página (grafite dedicado)</p>
          </div>
          <Card padding="md">
            <p className="text-xs font-semibold text-muted-foreground">surface-1 — elevada</p>
            <p className="mt-1 text-sm">Card, painel, tabela</p>
          </Card>
          <Card
            padding="md"
            style={{ background: "linear-gradient(135deg, oklch(var(--card)), oklch(70% 0.10 250 / 0.15))" }}
          >
            <p className="text-xs font-semibold text-muted-foreground">surface-2 — destaque</p>
            <p className="mt-1 text-sm">
              Card de KPI em destaque, banner de onboarding — degradê decorativo atrás, nunca atrás de texto
              denso.
            </p>
          </Card>
        </div>
      </Subsection>

      <Subsection title="Sombra só em elementos flutuantes reais">
        <div className="flex flex-wrap items-center gap-6">
          <div className="flex flex-col items-center gap-2">
            <Card padding="sm" className="shadow-none">
              <p className="text-sm">Card estático — sem sombra</p>
            </Card>
            <span className="text-xs text-muted-foreground">shadow: none</span>
          </div>
          <div className="flex flex-col items-center gap-2">
            <Tooltip content="Tooltip real — shadow-md">
              <button
                type="button"
                className="rounded-md border border-border bg-card px-3 py-2 text-sm shadow-md"
              >
                Passe o mouse (Tooltip)
              </button>
            </Tooltip>
            <span className="text-xs text-muted-foreground">shadow-md — flutuante</span>
          </div>
        </div>
      </Subsection>
    </Section>
  );
}
