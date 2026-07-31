"use client";

import { PackageOpen } from "lucide-react";
import { Button, EmptyState } from "@nave/ui";
import { Section, StateRow, Subsection } from "../section-shell";

const VARIANTS = ["default", "outline", "ghost", "destructive"] as const;
const SIZES = ["sm", "md", "lg"] as const;

export function AcoesSection() {
  return (
    <Section title="Ações" description="Button (packages/ui/src/components/button.tsx) e EmptyState — matriz completa de variant × size e estados.">
      <Subsection title="Button — variant × size">
        {VARIANTS.map((variant) => (
          <StateRow key={variant} label={variant}>
            {SIZES.map((size) => (
              <Button key={size} variant={variant} size={size}>
                {size}
              </Button>
            ))}
          </StateRow>
        ))}
      </Subsection>

      <Subsection title="Button — estados">
        <StateRow label="default">
          <Button>Salvar despesa</Button>
        </StateRow>
        <StateRow label="disabled">
          <Button disabled>Salvar despesa</Button>
        </StateRow>
        <StateRow label="loading">
          <Button loading>Salvando</Button>
        </StateRow>
        <StateRow label="focus-visible">
          <Button className="ring-2 ring-primary ring-offset-2">Simulação de foco</Button>
        </StateRow>
      </Subsection>

      <Subsection title="EmptyState com ações">
        <EmptyState
          icon={<PackageOpen size={32} strokeWidth={1.5} aria-hidden />}
          title="Nenhuma despesa por aqui ainda"
          description="Registre a primeira e comece a ver para onde o dinheiro do seu carro está indo."
          action={{ label: "Registrar despesa", onClick: () => {} }}
          secondaryAction={{ label: "Importar CSV", onClick: () => {} }}
        />
      </Subsection>
    </Section>
  );
}
