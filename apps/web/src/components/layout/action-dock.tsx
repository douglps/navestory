"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, type ReactNode } from "react";
import { useDashboardStore } from "@/lib/stores/use-dashboard-store";

interface DockAction {
  key: string;
  label: string;
  icon: string;
  href: string;
}

/**
 * `/expenses/new` e `/maintenance/new` já herdam `activeVehicleId` do store global sozinhos
 * (`useVehicleContextField`, T5.3d) — o dock não precisa (nem deve) propagar `?vehicleId=`
 * (RF-DC-04 já satisfeito por aquele hook, sem duplicar a ponte proibida por R-CTX-04).
 */
function buildActions(activeVehicleId: string | null): DockAction[] {
  return [
    { key: "fuel", label: "Abastecer", icon: "⛽", href: "/expenses/new?category=fuel" },
    { key: "expense", label: "Nova Despesa", icon: "🧾", href: "/expenses/new" },
    { key: "maintenance", label: "Manutenção", icon: "🔧", href: "/maintenance/new" },
    {
      key: "odometer",
      label: "Registrar KM",
      icon: "📍",
      // Sem veículo em foco não há id para compor a rota — leva à lista para o usuário escolher.
      href: activeVehicleId ? `/vehicles/${activeVehicleId}/odometer` : "/vehicles",
    },
  ];
}

/**
 * @spec SPEC-20260531-001 RF-DC-01, RF-DC-02, RF-DC-02.1, RF-DC-03, RF-DC-04, RF-DC-05, RF-DC-06
 * "Multa" e "IA Nave" ficam de fora do dock 2×2 por decisão da spec (RF-DC-02.1) — não são
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
      <div className="fixed inset-x-0 bottom-0 z-20 flex justify-center lg:hidden">
        {dockOpen && (
          <div className="absolute bottom-16 grid w-64 grid-cols-2 gap-2 rounded-lg border bg-white p-3 shadow-lg">
            {actions.map((action) => (
              <Link
                key={action.key}
                href={action.href}
                onClick={() => setDockOpen(false)}
                className="flex min-h-[44px] flex-col items-center justify-center gap-1 rounded border p-2 text-xs"
              >
                <span aria-hidden className="text-lg leading-none">
                  {action.icon}
                </span>
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
          className="mb-3 flex h-14 w-14 items-center justify-center rounded-full border bg-white text-2xl shadow-lg"
        >
          {dockOpen ? "×" : "⊕"}
        </button>
      </div>

      {/* Desktop >=1024px: botões inline compactos (RF-DC-05) */}
      <div className="hidden gap-2 lg:flex">
        {actions.map((action) => (
          <Link
            key={action.key}
            href={action.href}
            className="flex min-h-[44px] items-center gap-1.5 rounded border px-3 text-sm"
          >
            <span aria-hidden>{action.icon}</span>
            {action.label}
          </Link>
        ))}
      </div>
    </>
  );
}
