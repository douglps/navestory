"use client";

import { type ReactNode, useId, useState } from "react";
import * as Popover from "@radix-ui/react-popover";
import { Command as Cmdk } from "cmdk";
import { cn } from "../lib/cn";

/**
 * @spec SPEC-20260525-001 §7.2
 * `@radix-ui/react-popover` + `cmdk` (que também usa Radix internamente) — decisão
 * registrada em IMPACTO-038: mantém uma única árvore de dependências headless no
 * projeto, coerente com `@radix-ui/react-dialog`/`vaul` já em produção (T5.4).
 */
function ChevronIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M4 6l4 4 4-4" />
    </svg>
  );
}

function CheckIcon(): ReactNode {
  return (
    <svg
      aria-hidden="true"
      width="16"
      height="16"
      viewBox="0 0 16 16"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3.5 8.5l3 3 6-7" />
    </svg>
  );
}

export interface ComboboxOption {
  value: string;
  label: string;
  description?: string;
  icon?: ReactNode;
  disabled?: boolean;
}

export interface ComboboxProps {
  id?: string;
  options: ComboboxOption[];
  value?: string;
  onValueChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyMessage?: string;
  loading?: boolean;
  disabled?: boolean;
  error?: string;
  className?: string;
  "aria-label"?: string;
}

/** @spec SPEC-20260525-001 §7.2 */
export function Combobox({
  id,
  options,
  value,
  onValueChange,
  placeholder = "Selecionar",
  searchPlaceholder = "Buscar...",
  emptyMessage = "Nenhum resultado encontrado",
  loading = false,
  disabled = false,
  error,
  className,
  "aria-label": ariaLabel,
}: ComboboxProps): ReactNode {
  const [open, setOpen] = useState(false);
  const selected = options.find((option) => option.value === value);
  const listboxId = useId();

  return (
    <Popover.Root open={open} onOpenChange={setOpen}>
      <Popover.Trigger asChild>
        <button
          id={id}
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-label={ariaLabel}
          aria-invalid={error ? true : undefined}
          disabled={disabled || loading}
          className={cn(
            "flex h-11 w-full items-center justify-between gap-2 rounded-md border bg-background px-3 text-sm",
            "disabled:pointer-events-none disabled:opacity-50",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2",
            error ? "border-danger" : "border-border",
            className,
          )}
        >
          <span className={cn("flex items-center gap-2 truncate", !selected && "text-muted-foreground")}>
            {selected?.icon && (
              <span aria-hidden="true">{selected.icon}</span>
            )}
            {selected ? selected.label : loading ? "Carregando..." : placeholder}
          </span>
          <ChevronIcon />
        </button>
      </Popover.Trigger>
      <Popover.Portal>
        <Popover.Content
          align="start"
          sideOffset={4}
          aria-label={ariaLabel ?? searchPlaceholder}
          id={listboxId}
          className="z-[150] w-[var(--radix-popover-trigger-width)] overflow-hidden rounded-md border border-border bg-card text-card-foreground shadow-lg"
        >
          <Cmdk shouldFilter loop>
            <div className="border-b border-border px-3">
              <Cmdk.Input
                placeholder={searchPlaceholder}
                className="h-10 w-full bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              />
            </div>
            <Cmdk.List className="max-h-60 overflow-y-auto p-1">
              <Cmdk.Empty className="px-3 py-6 text-center text-sm text-muted-foreground">
                {emptyMessage}
              </Cmdk.Empty>
              {options.map((option) => (
                <Cmdk.Item
                  key={option.value}
                  value={`${option.label} ${option.description ?? ""}`}
                  disabled={option.disabled}
                  onSelect={() => {
                    onValueChange(option.value);
                    setOpen(false);
                  }}
                  className={cn(
                    "flex cursor-pointer items-center gap-2 rounded-sm px-2 py-2 text-sm",
                    "data-[selected=true]:bg-muted",
                    "data-[disabled=true]:pointer-events-none data-[disabled=true]:opacity-50",
                  )}
                >
                  <span className="w-4 shrink-0" aria-hidden="true">
                    {option.value === value && <CheckIcon />}
                  </span>
                  {option.icon && <span aria-hidden="true">{option.icon}</span>}
                  <span className="flex flex-col truncate">
                    <span className="truncate">{option.label}</span>
                    {option.description && (
                      <span className="truncate text-xs text-muted-foreground">{option.description}</span>
                    )}
                  </span>
                </Cmdk.Item>
              ))}
            </Cmdk.List>
          </Cmdk>
        </Popover.Content>
      </Popover.Portal>
      {error && <p className="mt-1 text-sm text-danger">{error}</p>}
    </Popover.Root>
  );
}
