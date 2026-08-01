"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

type DockActionIcon = (props: { className?: string }) => ReactNode;

interface DockAction {
  key: string;
  label: string;
  icon: DockActionIcon;
  accent: string;
  href: string;
}

// Ícones inline (mesmo padrão do hamburger em header.tsx — sem dependência de biblioteca nova).
const FuelIcon: DockActionIcon = ({ className }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M4 17V5a1 1 0 0 1 1-1h5a1 1 0 0 1 1 1v12M4 17h6M4 9h6" />
    <path d="M11 8h1.6l2 2v4.5a1.1 1.1 0 0 1-2.2 0V13" />
  </svg>
);

const ExpenseIcon: DockActionIcon = ({ className }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M5 3h10v14l-2.5-1.5L10 17l-2.5-1.5L5 17V3Z" />
    <path d="M7.5 7h5M7.5 10h5" />
  </svg>
);

const MaintenanceIcon: DockActionIcon = ({ className }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M13.5 3.5a3 3 0 0 0-3.9 3.9L4 13l3 3 5.6-5.6a3 3 0 0 0 3.9-3.9l-2.1 2.1-1.9-1.9 2.1-2.1Z" />
  </svg>
);

const OdometerIcon: DockActionIcon = ({ className }) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 20 20"
    fill="none"
    stroke="currentColor"
    strokeWidth={1.6}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
  >
    <path d="M10 17.5c4.14 0 7.5-3.36 7.5-7.5S14.14 2.5 10 2.5 2.5 5.86 2.5 10c0 1.6.5 3.08 1.36 4.3" />
    <path d="M10 10 13 6.5" />
    <circle cx="10" cy="10" r="1.1" fill="currentColor" stroke="none" />
  </svg>
);

/**
 * `/expenses/new` e `/maintenance/new` já herdam `activeVehicleId` do store global sozinhos
 * (`useVehicleContextField`, T5.3d) — o dock não precisa (nem deve) propagar `?vehicleId=`
 * (RF-DC-04 já satisfeito por aquele hook, sem duplicar a ponte proibida por R-CTX-04).
 */
function buildActions(activeVehicleId: string | null): DockAction[] {
  return [
    {
      key: "fuel",
      label: "Abastecer",
      icon: FuelIcon,
      accent: "text-success",
      href: "/expenses/new?category=fuel",
    },
    {
      key: "expense",
      label: "Nova Despesa",
      icon: ExpenseIcon,
      accent: "text-warning-foreground",
      href: "/expenses/new",
    },
    {
      key: "maintenance",
      label: "Manutenção",
      icon: MaintenanceIcon,
      accent: "text-primary",
      href: "/maintenance/new",
    },
    {
      key: "odometer",
      label: "Registrar KM",
      icon: OdometerIcon,
      accent: "text-info",
      // Sem veículo em foco não há id para compor a rota — leva à lista para o usuário escolher.
      href: activeVehicleId
        ? `/vehicles/${activeVehicleId}/odometer`
        : "/vehicles",
    },
  ];
}

/**
 * @spec SPEC-20260531-001 RF-DC-01, RF-DC-02, RF-DC-02.1, RF-DC-03, RF-DC-04, RF-DC-05, RF-DC-06
 * "Multa" e "IA navestory" ficam de fora do dock 2×2 por decisão da spec (RF-DC-02.1) — não são
 * omissão. "Novo Veículo" também não entra (RF-DC-03).
 */
export function ActionDock(): ReactNode {
  const activeVehicleId = useDashboardStore((state) => state.activeVehicleId);
  const dockOpen = useDashboardStore((state) => state.dockOpen);
  const setDockOpen = useDashboardStore((state) => state.setDockOpen);
  const pathname = usePathname();

  // RF-DC-06: fecha o painel automaticamente ao navegar para outra rota.
  useEffect(() => {
    setDockOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const actions = buildActions(activeVehicleId);

  return (
    <>
      {/* Mobile: dock fixo com botão central expansível (RF-DC-01) */}
      <div className="fixed inset-x-0 bottom-0 z-[150] flex flex-col items-center gap-3 pb-4 lg:hidden">
        {dockOpen && (
          <div className="grid w-64 grid-cols-2 gap-2 rounded-lg border border-border bg-card/95 p-3 shadow-2xl backdrop-blur-xl">
            {actions.map((action) => (
              <Link
                key={action.key}
                href={action.href}
                onClick={() => setDockOpen(false)}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1.5 rounded-md border border-border/50 bg-muted/30 p-2 text-xs text-foreground transition-colors hover:bg-muted/60"
              >
                <action.icon className={`size-5 ${action.accent}`} />
                {action.label}
              </Link>
            ))}
          </div>
        )}
        <button
          type="button"
          aria-label={dockOpen ? "Fechar ações rápidas" : "Abrir ações rápidas"}
          aria-expanded={dockOpen}
          onClick={() => setDockOpen(!dockOpen)}
          className="flex h-14 w-14 items-center justify-center rounded-full border border-border bg-primary text-primary-foreground shadow-2xl transition-transform duration-200 hover:bg-primary/90"
        >
          <svg
            aria-hidden="true"
            width="22"
            height="22"
            viewBox="0 0 20 20"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            className={`transition-transform duration-200 ${dockOpen ? "rotate-45" : ""}`}
          >
            <path d="M10 3v14M3 10h14" />
          </svg>
        </button>
      </div>

      {/* Desktop >=1024px: botões inline compactos (RF-DC-05) */}
      <div className="hidden gap-2 lg:flex">
        {actions.map((action) => (
          <Link
            key={action.key}
            href={action.href}
            className="flex min-h-[44px] items-center gap-1.5 rounded-md border border-border bg-card px-3 text-sm text-foreground transition-colors hover:bg-muted/50"
          >
            <action.icon className={`size-4 ${action.accent}`} />
            {action.label}
          </Link>
        ))}
      </div>
    </>
  );
}
