import { Section } from "../section-shell";

const MUDANCAS = [
  {
    fundamento: "Cor primária",
    antes: "Azul-prata frio (H≈259)",
    depois: "Azul-índigo (H≈250)",
  },
  {
    fundamento: "Fundo dark mode",
    antes: "Tom escurecido da família do primário",
    depois: "Grafite dedicado (≈#13131A), família neutra própria",
  },
  {
    fundamento: "Papel do ouro",
    antes: "Acento único, ~5-10% da superfície",
    depois: "Acento (inalterado) + secundária estrutural (bronze)",
  },
  {
    fundamento: "Escala tipográfica",
    antes: "Inexistente (defaults do Tailwind)",
    depois: "Inter, escala modular 1.2, tabular-nums obrigatório",
  },
  {
    fundamento: "Arquitetura de tokens",
    antes: "2 camadas implícitas",
    depois: "3 camadas explícitas (primitivo → semântico → componente)",
  },
  {
    fundamento: "Voz de marca",
    antes: "Não documentada formalmente",
    depois: "Personalidade, tom por contexto, exemplos",
  },
];

export function FundamentosSection() {
  return (
    <Section
      title="Fundamentos"
      description="Resumo da decisão aprovada em 2026-07-30 — substitui a direção Prata (SPEC-20260729-001). Toda a proposta está em specs/design-system/PROPOSTA-BRAND-DESIGN-SYSTEM-2026-07-30.md."
    >
      <div className="rounded-lg border border-border bg-card p-4">
        <h3 className="text-sm font-semibold">Princípio central — "Calm UI"</h3>
        <p className="mt-1 text-sm text-muted-foreground">
          navestory é um SaaS de gestão de veículos/frota consultado
          repetidamente ao longo do dia, com momentos neutros (consulta de
          rotina) e momentos emocionalmente carregados (despesa inesperada,
          manutenção cara, alerta de atraso). A interface deve responder "meu
          veículo/minha frota está saudável hoje?" em segundos. Nenhuma decisão
          de cor, tipografia ou componente pode comprometer esse princípio.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">P1 — Douglas</h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Mantenedor do navestory. Responsável pela identidade visual e
            consistência do design system, decisor final de marca.
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <h3 className="text-sm font-semibold">
            P2 — Gestor de frota / usuário final
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            Consulta dashboards densos de dados por longos períodos, em light e
            dark mode, tanto em rotina tranquila quanto em momentos de estresse
            financeiro/operacional.
          </p>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border bg-card text-left text-muted-foreground">
              <th className="p-2 font-medium">Fundamento</th>
              <th className="p-2 font-medium">Antes (Prata)</th>
              <th className="p-2 font-medium">Depois (Azul-Índigo)</th>
            </tr>
          </thead>
          <tbody>
            {MUDANCAS.map((row) => (
              <tr
                key={row.fundamento}
                className="border-b border-border last:border-0"
              >
                <td className="p-2 font-medium">{row.fundamento}</td>
                <td className="p-2 text-muted-foreground">{row.antes}</td>
                <td className="p-2">{row.depois}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="rounded-lg border border-border bg-card p-4 text-sm text-muted-foreground">
        Este showcase usa os componentes REAIS de{" "}
        <code className="text-foreground">@navestory/ui</code>, re-temizados
        localmente via CSS custom properties — nenhum arquivo de produção (
        <code className="text-foreground">packages/ui</code>,{" "}
        <code className="text-foreground">globals.css</code>,{" "}
        <code className="text-foreground">tailwind.config.ts</code>) foi
        alterado. É a prova visual antes da migração real de tokens (Plano de
        Adoção), que fica para uma etapa futura e separada.
      </div>
    </Section>
  );
}
