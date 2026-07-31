import type { ReactNode } from "react";

interface SectionProps {
  title: string;
  description?: ReactNode;
  children: ReactNode;
}

/** Cabeçalho padrão de cada aba do showcase — título + descrição curta + conteúdo. */
export function Section({ title, description, children }: SectionProps) {
  return (
    <section className="flex flex-col gap-4">
      <div>
        <h2 className="text-xl font-bold">{title}</h2>
        {description && <p className="mt-1 max-w-3xl text-sm text-muted-foreground">{description}</p>}
      </div>
      {children}
    </section>
  );
}

interface SubsectionProps {
  title: string;
  children: ReactNode;
}

/** Subdivisão dentro de uma aba (ex: "Variant × Size" dentro de Ações). */
export function Subsection({ title, children }: SubsectionProps) {
  return (
    <div className="flex flex-col gap-3 rounded-lg border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-muted-foreground">{title}</h3>
      {children}
    </div>
  );
}

interface StateRowProps {
  label: string;
  children: ReactNode;
}

/** Linha "label: componente" usada nas matrizes de estado (default/hover/disabled/...). */
export function StateRow({ label, children }: StateRowProps) {
  return (
    <div className="flex flex-wrap items-center gap-3">
      <span className="w-28 shrink-0 text-xs text-muted-foreground">{label}</span>
      <div className="flex flex-wrap items-center gap-3">{children}</div>
    </div>
  );
}
