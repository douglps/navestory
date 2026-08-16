"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import dynamic from "next/dynamic";
import { Keyboard, Search } from "lucide-react";
import { Icon, type CommandPaletteItem } from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";

// RNF-03: `CommandPalette` (e suas dependências `cmdk`/`@radix-ui/react-dialog`) fica em
// chunk separado, buscado só na primeira abertura — não entra no bundle inicial do shell.
const CommandPalette = dynamic(
  () => import("@navestory/ui").then((mod) => mod.CommandPalette),
  {
    ssr: false,
  },
);

interface VehicleSummary {
  id: string;
  plate: string;
  make: string | null;
  model: string | null;
  nickname: string | null;
}

interface ExpenseSummary {
  id: string;
  category: string;
  amount: number;
  occurred_at: string;
}

interface MaintenanceSummary {
  id: string;
  description: string;
  scheduled_date: string;
}

interface FineSummary {
  id: string;
  description: string;
  occurred_at: string;
}

function normalize(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

/**
 * @spec SPEC-20260721-001 RF-06
 * Trigger global de `Ctrl+K`/`⌘K` (F-5). Busca client-side sobre veículos, despesas,
 * manutenções e multas já carregáveis pela API existente — sem endpoint de busca full-text
 * dedicado (fora do escopo desta spec, ver "Fora de Escopo" em SPEC-20260721-001). As queries
 * usam as mesmas `queryKey` já em uso nas telas (`["vehicles"]`, `["expenses"]`,
 * `["maintenances"]`, `["fines"]`), reaproveitando o cache do TanStack Query quando o usuário
 * já navegou por essas telas.
 */
export function CommandPaletteTrigger(): ReactNode {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  // RNF-03: só monta (e só então baixa o chunk) o `CommandPalette` após a primeira
  // abertura — nem o clique no botão nem o `Ctrl+K` disparam o fetch do chunk antes disso.
  const [hasOpenedOnce, setHasOpenedOnce] = useState(false);
  const router = useRouter();

  useEffect(() => {
    function handleKeyDown(event: KeyboardEvent): void {
      const isShortcut =
        (event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k";
      if (!isShortcut) return;
      event.preventDefault();
      setOpen((current) => {
        const next = !current;
        if (next) setHasOpenedOnce(true);
        return next;
      });
    }
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<VehicleSummary[]>("/vehicles"),
    enabled: open,
    retry: false,
    staleTime: 60_000,
  });

  const { data: expenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => apiClient<ExpenseSummary[]>("/expenses"),
    enabled: open,
    retry: false,
    staleTime: 60_000,
  });

  const { data: maintenances } = useQuery({
    queryKey: ["maintenances"],
    queryFn: () => apiClient<MaintenanceSummary[]>("/maintenances?limit=100"),
    enabled: open,
    retry: false,
    staleTime: 60_000,
  });

  const { data: fines } = useQuery({
    queryKey: ["fines"],
    queryFn: () => apiClient<FineSummary[]>("/fines"),
    enabled: open,
    retry: false,
    staleTime: 60_000,
  });

  const allItems = useMemo<CommandPaletteItem[]>(() => {
    const vehicleItems: CommandPaletteItem[] = (vehicles ?? []).map(
      (vehicle) => ({
        id: `vehicle-${vehicle.id}`,
        category: "Veículos",
        label:
          vehicle.nickname ??
          (`${vehicle.make ?? ""} ${vehicle.model ?? ""}`.trim() ||
            vehicle.plate),
        description: vehicle.plate,
        onSelect: () => router.push(`/vehicles/${vehicle.id}`),
      }),
    );

    const expenseItems: CommandPaletteItem[] = (expenses ?? []).map(
      (expense) => ({
        id: `expense-${expense.id}`,
        category: "Despesas",
        label: expense.category,
        description: expense.occurred_at.slice(0, 10),
        onSelect: () => router.push(`/expenses/${expense.id}`),
      }),
    );

    const maintenanceItems: CommandPaletteItem[] = (maintenances ?? []).map(
      (maintenance) => ({
        id: `maintenance-${maintenance.id}`,
        category: "Manutenções",
        label: maintenance.description,
        description: maintenance.scheduled_date,
        onSelect: () => router.push(`/maintenance/${maintenance.id}`),
      }),
    );

    const fineItems: CommandPaletteItem[] = (fines ?? []).map((fine) => ({
      id: `fine-${fine.id}`,
      category: "Multas",
      label: fine.description,
      description: fine.occurred_at.slice(0, 10),
      onSelect: () => router.push(`/fines/${fine.id}`),
    }));

    return [
      ...vehicleItems,
      ...expenseItems,
      ...maintenanceItems,
      ...fineItems,
    ];
  }, [vehicles, expenses, maintenances, fines, router]);

  const filteredItems = useMemo(() => {
    if (query.length < 2) return [];
    const needle = normalize(query);
    return allItems.filter(
      (item) =>
        normalize(item.label).includes(needle) ||
        normalize(item.description ?? "").includes(needle),
    );
  }, [allItems, query]);

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setHasOpenedOnce(true);
          setOpen(true);
        }}
        className="glass-card grid h-9 w-64 grid-cols-[auto_1fr_auto] items-center gap-2 rounded-full px-3 text-sm text-muted-foreground shadow-sm transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
      >
        {/* @spec SPEC-20260813-001 RF-17 — emoji substituído pelo wrapper <Icon> do design system */}
        <Icon icon={Search} size="sm" className="shrink-0" />
        <span className="hidden truncate text-center sm:inline">
          Buscar...
        </span>
        <kbd className="hidden shrink-0 items-center gap-1 rounded-full border border-border/60 bg-background/40 px-2 py-1 text-xs font-medium text-muted-foreground sm:flex">
          <Keyboard className="h-3 w-3" aria-hidden="true" />
          Ctrl+K
        </kbd>
      </button>

      {hasOpenedOnce && (
        <CommandPalette
          open={open}
          onOpenChange={(next) => {
            setOpen(next);
            if (!next) setQuery("");
          }}
          items={filteredItems}
          query={query}
          onQueryChange={setQuery}
          emptyMessage={
            query.length < 2
              ? "Digite ao menos 2 caracteres"
              : `Nenhum resultado para "${query}"`
          }
        />
      )}
    </>
  );
}
