import Link from "next/link";
import type { ReactNode } from "react";

const PLATAFORMA_LINKS = [
  { label: "Dashboard", href: "/dashboard" },
  { label: "Veículos", href: "/vehicles" },
  { label: "Manutenções", href: "/maintenance" },
  { label: "Despesas", href: "/expenses" },
];

const CONTA_LINKS = [
  { label: "Preferências", href: "/settings/preferences" },
  { label: "Minha conta", href: "/settings/account" },
];

/**
 * Rodapé decorativo do shell — sem regra de negócio, apenas identidade visual e navegação
 * secundária para rotas que já existem no app (nenhum link `href="#"`).
 */
export function SystemFooter(): ReactNode {
  return (
    <div className="mt-12 space-y-6 pt-8">
      <div className="h-px w-full rounded-full bg-border" />

      <footer
        role="contentinfo"
        className="grid grid-cols-1 gap-6 rounded-lg border border-border bg-card p-6 text-card-foreground md:grid-cols-2 md:p-8"
      >
        <div className="space-y-2">
          <span className="text-sm font-semibold">Nave</span>
          <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">
            Gestão de frota e veículos: despesas, manutenções e documentos em um só lugar.
          </p>
          <p className="text-[11px] text-muted-foreground">© {new Date().getFullYear()} Nave</p>
        </div>

        <div className="grid grid-cols-2 gap-6 md:justify-items-end">
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Plataforma
            </span>
            <nav className="flex flex-col gap-1.5">
              {PLATAFORMA_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
          <div className="space-y-2">
            <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
              Conta
            </span>
            <nav className="flex flex-col gap-1.5">
              {CONTA_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                >
                  {link.label}
                </Link>
              ))}
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
