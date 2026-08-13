"use client";

import { cva, type VariantProps } from "class-variance-authority";
import React, { type HTMLAttributes } from "react";
import { cn } from "../lib/cn";

/*
 * Mapeamento de variantes semânticas → escala tipográfica do navestory.
 *
 * As chaves Tailwind `text-*` abaixo são as remapeadas em apps/web/tailwind.config.ts
 * a partir de packages/ui/src/tokens/typography.ts (SPEC-20260731-003):
 *
 *   text-xs   → 11px / lh 1.5   — Labels de campo, metadados
 *   text-sm   → 13px / lh 1.45  — Corpo de tabela, badges
 *   text-base → 15px / lh 1.5   — Corpo padrão, parágrafos
 *   text-md   → 18px / lh 1.4   — Subtítulos de seção
 *   text-lg   → 22px / lh 1.3   — Título de página
 *   text-xl   → 26px / lh 1.25  — KPI principal
 *   text-2xl  → 32px / lh 1.2   — Display de destaque
 *
 * A variante `kicker` corresponde à classe .kicker definida em apps/web/globals.css
 * (font-bold uppercase tracking-wide text-on-surface-subtle) — encapsulada aqui
 * para evitar a necessidade de importar o utilitário global ad hoc.
 */
const typographyVariants = cva("font-sans", {
  variants: {
    variant: {
      /** 15px — parágrafos, texto de card, descrições longas */
      body: "text-base text-foreground",
      /** 13px muted — metadados, textos secundários, helper texts */
      caption: "text-sm text-muted-foreground",
      /** 11px — labels de campo de formulário, hints */
      label: "text-xs text-foreground",
      /** 18px semibold — subtítulos de seção, cabeçalhos de grupo */
      subheading: "text-md font-semibold text-foreground",
      /** 22px bold — títulos de página, cabeçalhos de card principal */
      heading: "text-lg font-bold text-foreground",
      /** 26px extrabold mono tabular — valor KPI principal (ex.: custo total) */
      kpi: "text-xl font-extrabold tabular-nums font-mono text-foreground",
      /** 32px bold — displays de destaque, banners de métricas isoladas */
      display: "text-2xl font-bold text-foreground",
      /**
       * 11px uppercase bold tracking-wide — equivalente à classe .kicker do globals.css.
       * Usar para rótulos de seção em caixa alta (ex.: "RESUMO", "FROTA ATIVA").
       */
      kicker: "text-xs font-bold uppercase tracking-[0.12em] text-on-surface-subtle",
      /** 13px mono tabular — valores numéricos em tabelas, datas, odômetros */
      data: "text-sm font-mono tabular-nums text-foreground",
    },
    weight: {
      normal: "font-normal",
      medium: "font-medium",
      semibold: "font-semibold",
      bold: "font-bold",
      extrabold: "font-extrabold",
    },
    align: {
      left: "text-left",
      center: "text-center",
      right: "text-right",
    },
  },
  defaultVariants: {
    variant: "body",
  },
});

export interface TypographyProps
  extends HTMLAttributes<HTMLElement>,
    VariantProps<typeof typographyVariants> {
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6" | "p" | "span" | "div" | "label";
  /** Para uso com `as="label"` — vincula ao campo correspondente. */
  htmlFor?: string;
}

/**
 * Componente de tipografia unificado com CVA.
 * Encapsula a escala tipográfica do navestory, eliminando classes de texto ad hoc
 * espalhadas por componentes individuais.
 *
 * Não migrar componentes existentes em massa — usar progressivamente
 * nos novos componentes e ao refatorar arquivos tocados.
 *
 * @example
 * ```tsx
 * <Typography variant="heading" as="h2">Resumo da frota</Typography>
 * <Typography variant="caption">Atualizado há 5 min</Typography>
 * <Typography variant="kicker" as="p">KPIs principais</Typography>
 * ```
 */
export function Typography({
  as: Tag = "p",
  variant,
  weight,
  align,
  className,
  ...props
}: TypographyProps) {
  // React.createElement necessário para componente polimórfico sem type gymnastics.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const Component = Tag as any;
  return (
    <Component
      className={cn(typographyVariants({ variant, weight, align }), className)}
      {...props}
    />
  );
}

export { typographyVariants };
