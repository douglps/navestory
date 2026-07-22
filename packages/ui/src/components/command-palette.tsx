"use client";

import type { ReactNode } from "react";
import * as RadixDialog from "@radix-ui/react-dialog";
import { Command as Cmdk } from "cmdk";
import { cn } from "../lib/cn";

export interface CommandPaletteItem {
  id: string;
  label: string;
  description?: string;
  category: string;
  icon?: ReactNode;
  onSelect: () => void;
}

export interface CommandPaletteProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: CommandPaletteItem[];
  placeholder?: string;
  emptyMessage?: string;
  /** Query atual (controlada pelo chamador) — permite mensagem "Nenhum resultado para X". */
  query: string;
  onQueryChange: (query: string) => void;
}

/**
 * @spec SPEC-20260721-001 RF-06
 * Busca global ativada por `Ctrl+K`/`⌘K` (F-5) — o listener de teclado fica no app
 * consumidor (`apps/web`), este componente só cuida do overlay + lista filtrada. Reusa
 * `@radix-ui/react-dialog` (focus-trap e `Esc` de graça, mesma família de `dialog.tsx`) com
 * `cmdk` para navegação por teclado (setas/Enter) e filtragem client-side sobre os `items`
 * já resolvidos pelo chamador — busca full-text server-side está fora do escopo desta spec.
 */
export function CommandPalette({
  open,
  onOpenChange,
  items,
  placeholder = "Buscar veículos, despesas, multas...",
  emptyMessage,
  query,
  onQueryChange,
}: CommandPaletteProps): ReactNode {
  const categories = Array.from(new Set(items.map((item) => item.category)));

  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="fixed inset-0 z-[200] bg-black/40 backdrop-blur-sm" />
        <RadixDialog.Content
          aria-describedby={undefined}
          className={cn(
            "fixed left-1/2 top-[15%] z-[201] w-[calc(100%-2rem)] max-w-lg -translate-x-1/2",
            "overflow-hidden rounded-lg border border-border bg-card text-card-foreground shadow-xl",
            "focus-visible:outline-none",
          )}
        >
          <RadixDialog.Title className="sr-only">Busca global</RadixDialog.Title>
          <Cmdk shouldFilter={false} loop>
            <div className="flex items-center gap-2 border-b border-border px-3">
              {/* Radix `Dialog.Content` já move o foco para o primeiro elemento focável ao
                  abrir (o próprio input) — sem necessidade de `autoFocus` explícito. */}
              <Cmdk.Input
                value={query}
                onValueChange={onQueryChange}
                placeholder={placeholder}
                className="h-12 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
              <kbd className="hidden shrink-0 rounded border border-border px-1.5 py-0.5 text-xs text-muted-foreground sm:inline">
                Esc
              </kbd>
            </div>
            <Cmdk.List className="max-h-80 overflow-y-auto p-1">
              <Cmdk.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage ?? (query ? `Nenhum resultado para "${query}"` : "Digite para buscar")}
              </Cmdk.Empty>
              {categories.map((category) => (
                <Cmdk.Group
                  key={category}
                  heading={category}
                  className="px-1 py-1 [&_[cmdk-group-heading]]:px-2 [&_[cmdk-group-heading]]:py-1.5 [&_[cmdk-group-heading]]:text-xs [&_[cmdk-group-heading]]:font-medium [&_[cmdk-group-heading]]:text-muted-foreground"
                >
                  {items
                    .filter((item) => item.category === category)
                    .map((item) => (
                      <Cmdk.Item
                        key={item.id}
                        value={item.id}
                        onSelect={() => {
                          item.onSelect();
                          onOpenChange(false);
                        }}
                        className={cn(
                          "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm",
                          "data-[selected=true]:bg-muted",
                        )}
                      >
                        {item.icon && <span aria-hidden="true">{item.icon}</span>}
                        <span className="flex flex-col truncate">
                          <span className="truncate">{item.label}</span>
                          {item.description && (
                            <span className="truncate text-xs text-muted-foreground">
                              {item.description}
                            </span>
                          )}
                        </span>
                      </Cmdk.Item>
                    ))}
                </Cmdk.Group>
              ))}
            </Cmdk.List>
          </Cmdk>
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
