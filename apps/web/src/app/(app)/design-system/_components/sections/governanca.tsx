import { Section, Subsection } from "../section-shell";

export function GovernancaSection() {
  return (
    <Section title="Governança" description="Fluxo de proposta de token novo e regra de versionamento (proposta §12).">
      <Subsection title="Prevenção de cor hardcoded (CI)">
        <p className="text-sm text-muted-foreground">
          Regra de lint (<code className="text-foreground">no-hardcoded-color</code>) detecta literais{" "}
          <code className="text-foreground">#hex</code>/<code className="text-foreground">rgb(</code>/
          <code className="text-foreground">hsl(</code>/<code className="text-foreground">oklch(</code> fora
          dos arquivos de token e falha o build — já em vigor desde SPEC-20260729-002 RF-04; manter e
          estender ao Stylelint para <code className="text-foreground">.css</code>/
          <code className="text-foreground">.module.css</code>.
        </p>
      </Subsection>

      <Subsection title="Fluxo de proposta de novo token">
        <ol className="list-inside list-decimal text-sm text-muted-foreground">
          <li>PR adiciona o token exclusivamente em colors.ts (primitivo) ou globals.css (semântico), com justificativa de uso no corpo do PR.</li>
          <li>Confirmar que nenhum token semântico existente já resolve o caso.</li>
          <li>Aprovação de ao menos um revisor com contexto de design system.</li>
          <li>Atualizar specs/RULES.md se o token introduzir regra nova de uso.</li>
          <li>Token de componente só é criado após o padrão aparecer em ≥3 componentes distintos.</li>
        </ol>
      </Subsection>

      <Subsection title="Versionamento">
        <p className="text-sm text-muted-foreground">
          Tokens semânticos rastreados por <code className="text-foreground">@spec</code> no changelog da
          spec que os alterou. Tokens primitivos renomeados mantêm alias{" "}
          <code className="text-foreground">@deprecated since DS-vX.Y</code> por um ciclo antes de remover,
          evitando regressão silenciosa.
        </p>
      </Subsection>

      <Subsection title="Plano de Adoção — fora do escopo deste showcase">
        <ol className="list-inside list-decimal text-sm text-muted-foreground">
          <li>ADR registrando a substituição da cor primária.</li>
          <li>Spec nova (SPEC-YYYYMMDD-NNN), com superseded_by apontando SPEC-20260729-001.</li>
          <li>Conversão OKLCH completa + contrastExpectations + jest-axe.</li>
          <li>Atualização de specs/RULES.md (nova regra R-DS-08) e matrices/rastreabilidade.md.</li>
          <li>Migração de packages/ui/src/tokens/colors.ts e apps/web/src/app/globals.css.</li>
          <li>Fechamento paralelo de C-DS-01 (contraste warning/success).</li>
        </ol>
      </Subsection>
    </Section>
  );
}
