"use client";

import { useEffect, useState } from "react";
import { Tabs } from "@navestory/ui";
import { DesignSystemScope } from "./_components/design-system-scope";
import { FundamentosSection } from "./_components/sections/fundamentos";
import { CoresTokensSection } from "./_components/sections/cores-tokens";
import { TipografiaSection } from "./_components/sections/tipografia";
import { ElevacaoSection } from "./_components/sections/elevacao";
import { AcoesSection } from "./_components/sections/acoes";
import { InputsSection } from "./_components/sections/inputs";
import { FeedbackSection } from "./_components/sections/feedback";
import { DadosSection } from "./_components/sections/dados";
import { NavegacaoSection } from "./_components/sections/navegacao";
import { IconografiaSection } from "./_components/sections/iconografia";
import { MotionSection } from "./_components/sections/motion";
import { VozSection } from "./_components/sections/voz";
import { AcessibilidadeSection } from "./_components/sections/acessibilidade";
import { GovernancaSection } from "./_components/sections/governanca";
import "./_lib/motion.css";

const TABS = [
  { value: "fundamentos", label: "Fundamentos" },
  { value: "cores", label: "Cores & Tokens" },
  { value: "tipografia", label: "Tipografia" },
  { value: "elevacao", label: "Elevação" },
  { value: "acoes", label: "Ações" },
  { value: "inputs", label: "Inputs" },
  { value: "feedback", label: "Feedback & Overlays" },
  { value: "dados", label: "Exibição de Dados" },
  { value: "navegacao", label: "Navegação" },
  { value: "iconografia", label: "Iconografia" },
  { value: "motion", label: "Motion" },
  { value: "voz", label: "Voz & Conteúdo" },
  { value: "acessibilidade", label: "Acessibilidade" },
  { value: "governanca", label: "Governança" },
] as const;

type TabValue = (typeof TABS)[number]["value"];

export default function DesignSystemPage() {
  const [tab, setTab] = useState<TabValue>("fundamentos");
  const [mode, setMode] = useState<"light" | "dark">("light");
  const [reducedMotion, setReducedMotion] = useState(false);

  // `_lib/motion.css` é escopado por `body.ds-motion-demo` porque Dialog/Tooltip fazem
  // portal para document.body — precisa da classe lá, não só na árvore local da página.
  useEffect(() => {
    document.body.classList.add("ds-motion-demo");
    return () => document.body.classList.remove("ds-motion-demo");
  }, []);

  useEffect(() => {
    document.body.classList.toggle("ds-reduced-motion", reducedMotion);
  }, [reducedMotion]);

  return (
    <DesignSystemScope mode={mode} className="min-h-screen">
      <div className="mx-auto flex max-w-6xl flex-col gap-6 p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
              Design System
            </p>
            <h1 className="text-2xl font-bold">Azul-Índigo</h1>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">
              Direção aprovada em 2026-07-30. Componentes reais de
              @navestory/ui, re-temizados localmente — nenhum token de produção
              foi alterado.
            </p>
          </div>
          <button
            type="button"
            onClick={() =>
              setMode((current) => (current === "light" ? "dark" : "light"))
            }
            className="inline-flex items-center gap-2 rounded-md border border-border bg-card px-3 py-1.5 text-sm font-medium"
          >
            {mode === "dark" ? "🌙 Escuro" : "☀️ Claro"}
          </button>
        </div>

        <div className="overflow-x-auto">
          <Tabs
            items={[...TABS]}
            value={tab}
            onValueChange={(v) => setTab(v as TabValue)}
            variant="underline"
            aria-label="Seções do design system"
          />
        </div>

        <div className="pb-16">
          {tab === "fundamentos" && <FundamentosSection />}
          {tab === "cores" && <CoresTokensSection mode={mode} />}
          {tab === "tipografia" && <TipografiaSection />}
          {tab === "elevacao" && <ElevacaoSection />}
          {tab === "acoes" && <AcoesSection />}
          {tab === "inputs" && <InputsSection />}
          {tab === "feedback" && <FeedbackSection />}
          {tab === "dados" && <DadosSection />}
          {tab === "navegacao" && <NavegacaoSection />}
          {tab === "iconografia" && <IconografiaSection />}
          {tab === "motion" && (
            <MotionSection
              reducedMotion={reducedMotion}
              onToggleReducedMotion={setReducedMotion}
            />
          )}
          {tab === "voz" && <VozSection />}
          {tab === "acessibilidade" && <AcessibilidadeSection />}
          {tab === "governanca" && <GovernancaSection />}
        </div>
      </div>
    </DesignSystemScope>
  );
}
