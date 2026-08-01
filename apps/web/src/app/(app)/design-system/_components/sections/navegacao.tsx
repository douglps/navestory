"use client";

import { useState } from "react";
import { Breadcrumb, Steps, Tabs } from "@navestory/ui";
import { Section, Subsection } from "../section-shell";

const TAB_ITEMS = [
  { value: "lista", label: "Lista" },
  { value: "proximas", label: "Próximas", badge: 4 },
  { value: "por-veiculo", label: "Por veículo" },
];

const BREADCRUMB_ITEMS = [
  { label: "Início", href: "/" },
  { label: "Veículos", href: "/vehicles" },
  { label: "Gol 2020", href: "/vehicles/1" },
  { label: "Manutenções", href: "/vehicles/1/maintenance" },
  { label: "Revisão dos 10.000 km" },
];

const STEPS = [
  { id: "1", label: "Veículo" },
  { id: "2", label: "Serviço" },
  { id: "3", label: "Custo" },
  { id: "4", label: "Confirmação" },
];

export function NavegacaoSection() {
  const [variant, setVariant] = useState<"default" | "pills" | "underline">(
    "underline",
  );
  const [tab, setTab] = useState("lista");

  return (
    <Section
      title="Navegação"
      description="Tabs (3 variantes), Breadcrumb (com colapso), Steps e Container."
    >
      <Subsection title="Tabs — variant">
        <div className="flex gap-2 text-xs">
          {(["default", "underline", "pills"] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setVariant(v)}
              className={`rounded-md border px-2 py-1 ${variant === v ? "border-primary text-primary" : "border-border text-muted-foreground"}`}
            >
              {v}
            </button>
          ))}
        </div>
        <Tabs
          items={TAB_ITEMS}
          value={tab}
          onValueChange={setTab}
          variant={variant}
          aria-label="Demo de navegação"
        />
      </Subsection>

      <Subsection title="Breadcrumb — colapso com maxItems">
        <Breadcrumb items={BREADCRUMB_ITEMS} maxItems={4} />
      </Subsection>

      <Subsection title="Steps — completed / current / upcoming / error">
        <Steps
          steps={STEPS}
          currentStep={2}
          completedSteps={[0, 1]}
          errorSteps={[]}
        />
        <Steps
          steps={STEPS}
          currentStep={2}
          completedSteps={[0]}
          errorSteps={[1]}
        />
      </Subsection>

      <Subsection title="Container">
        <p className="text-sm text-muted-foreground">
          Substitui{" "}
          <code className="text-foreground">
            {'<main className="mx-auto max-w-{size} p-8">'}
          </code>{" "}
          — 32 ocorrências convergidas em produção. Tamanhos: sm, md, 2xl, 3xl,
          4xl, 5xl.
        </p>
      </Subsection>
    </Section>
  );
}
