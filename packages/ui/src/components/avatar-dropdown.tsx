"use client";

import { type ReactNode } from "react";
import * as Popover from "@radix-ui/react-popover";
import { cn } from "../lib/cn";

export interface AvatarDropdownProps {
  name: string;
  email: string | null;
  /**
   * Nome do plano do usuário, exibido como badge no topo do popover.
   * @spec SPEC-20260813-001 RF-22 — string livre (não enum de tier); a estrutura de tiers é
   * responsabilidade da spec de monetização futura (Fase 9). Omitir para não exibir o badge.
   */
  plan?: string;
  accountHref?: string;
  onLogout: () => void;
  className?: string;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const first = parts[0]?.[0] ?? "";
  const last = parts.length > 1 ? (parts[parts.length - 1]?.[0] ?? "") : "";
  return `${first}${last}`.toUpperCase();
}

/**
 * @spec SPEC-20260730-002 RF-04, RF-05, RNF-04 — dropdown de identidade no header: avatar
 * (iniciais do nome como fallback), nome/email somente leitura, link para configurações e
 * logout por clique simples (sem hold-to-confirm — ver "Fora de Escopo" da spec, que reserva
 * essa proteção ao botão "Sair" da sidebar). Fecha via Esc/clique fora nativamente, herdado do
 * `@radix-ui/react-popover` (mesmo primitivo já usado em `combobox.tsx`).
 */
export function AvatarDropdown({
  name,
  email,
  plan,
  accountHref = "/settings/account",
  onLogout,
  className,
}: AvatarDropdownProps): ReactNode {
  const initials = getInitials(name);

  return (
    <Popover.Root>
      <Popover.Trigger asChild>
        <button
          type="button"
          aria-label="Menu do usuário"
          className={cn(
            "flex h-9 w-9 items-center justify-center rounded-full bg-primary text-sm font-medium text-primary-foreground hover:opacity-90",
            className,
          )}
        >
          {initials || "?"}
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="end"
          sideOffset={8}
          className={cn(
            "z-[210] min-w-56 rounded-md border border-border bg-card p-2 text-card-foreground shadow-md",
            "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out data-[state=open]:fade-in",
          )}
        >
          <div className="px-2 py-1.5">
            {plan && (
              <span className="mb-1.5 inline-flex items-center rounded-full bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
                {plan}
              </span>
            )}
            <p className="text-sm font-medium text-foreground">{name}</p>
            <p className="text-xs text-muted-foreground">{email ?? "—"}</p>
          </div>
          <div className="my-1 h-px bg-border" aria-hidden="true" />
          <a
            href={accountHref}
            className="block rounded-md px-2 py-1.5 text-sm text-foreground hover:bg-muted"
          >
            Configurações da conta
          </a>
          <button
            type="button"
            onClick={onLogout}
            className="block w-full rounded-md px-2 py-1.5 text-left text-sm text-foreground hover:bg-muted"
          >
            Sair
          </button>
        </Popover.Content>
      </Popover.Portal>
    </Popover.Root>
  );
}
