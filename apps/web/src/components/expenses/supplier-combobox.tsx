"use client";

import type { SupplierSuggestion } from "@navestory/validators";
import { Input, Popover, PopoverAnchor, PopoverContent } from "@navestory/ui";
import { useQuery } from "@tanstack/react-query";
import {
  useId,
  useMemo,
  useState,
  type KeyboardEvent,
  type ReactNode,
} from "react";
import { apiClient } from "@/lib/http/api-client";
import { useDebouncedValue } from "@/lib/hooks/use-debounced-value";

export interface SupplierComboboxProps {
  id?: string;
  value: string;
  onChange: (value: string) => void;
  workspaceId?: string;
}

const DEBOUNCE_MS = 200;

interface FlatOption {
  suggestion: SupplierSuggestion;
  groupLabel: string | null;
}

/**
 * @spec SPEC-20260814-003 RF-01, RF-04, RF-05, RF-07, RF-10, RNF-03, RNF-04
 * Substitui o `<Input list="supplier-suggestions">` + `<datalist>` anterior (SPEC-20260606-002
 * RF-02). Campo de texto livre (R-FUEL-04) com sugestões — `Command`/`cmdk` não é usado aqui
 * porque força seleção de uma opção da lista; este campo precisa aceitar qualquer valor digitado
 * mesmo com o menu aberto, por isso a combinação direta `Popover` (`@navestory/ui`) + `Input` +
 * navegação por teclado própria (RNF-04), sem o `Combobox` padrão do design system (que só
 * permite valores presentes nas opções).
 */
export function SupplierCombobox({
  id,
  value,
  onChange,
  workspaceId,
}: SupplierComboboxProps): ReactNode {
  const [open, setOpen] = useState(false);
  const [highlightedIndex, setHighlightedIndex] = useState(-1);
  const listboxId = useId();
  const debouncedQuery = useDebouncedValue(value, DEBOUNCE_MS);

  /** @spec RF-04, RF-10 — fire-and-forget: erro vira lista vazia, campo continua editável */
  const { data } = useQuery({
    queryKey: ["expense-suppliers", debouncedQuery, workspaceId],
    queryFn: () => {
      const params = new URLSearchParams();
      if (debouncedQuery.trim() !== "") params.set("q", debouncedQuery.trim());
      if (workspaceId) params.set("workspace_id", workspaceId);
      const qs = params.toString();
      return apiClient<SupplierSuggestion[]>(
        `/expenses/suppliers${qs ? `?${qs}` : ""}`,
      );
    },
    retry: false,
    placeholderData: (previous) => previous,
  });

  /** @spec RF-05 — pessoais primeiro, sem label de grupo quando não há sugestão de workspace */
  const flatOptions = useMemo<FlatOption[]>(() => {
    const suggestions = data ?? [];
    const personal = suggestions.filter((s) => s.source === "personal");
    const workspace = suggestions.filter((s) => s.source === "workspace");
    const hasBothGroups = personal.length > 0 && workspace.length > 0;
    return [
      ...personal.map((suggestion) => ({
        suggestion,
        groupLabel: hasBothGroups ? "Seus postos recentes" : null,
      })),
      ...workspace.map((suggestion) => ({
        suggestion,
        groupLabel: hasBothGroups ? "Mais usado no workspace" : null,
      })),
    ];
  }, [data]);

  function selectOption(supplier: string): void {
    onChange(supplier);
    setOpen(false);
    setHighlightedIndex(-1);
  }

  /** @spec RF-07, RNF-04 */
  function handleKeyDown(event: KeyboardEvent<HTMLInputElement>): void {
    if (event.key === "Escape") {
      setOpen(false);
      setHighlightedIndex(-1);
      return;
    }
    if (!open || flatOptions.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current + 1 >= flatOptions.length ? 0 : current + 1,
      );
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setHighlightedIndex((current) =>
        current - 1 < 0 ? flatOptions.length - 1 : current - 1,
      );
    } else if (event.key === "Enter" && highlightedIndex >= 0) {
      event.preventDefault();
      const option = flatOptions.at(highlightedIndex);
      if (option) selectOption(option.suggestion.supplier);
    }
  }

  let lastGroupLabel: string | null | undefined;

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverAnchor asChild>
        <Input
          id={id}
          role="combobox"
          aria-expanded={open}
          aria-controls={listboxId}
          aria-autocomplete="list"
          autoComplete="off"
          value={value}
          onChange={(event) => {
            onChange(event.target.value);
            setOpen(true);
            setHighlightedIndex(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={handleKeyDown}
        />
      </PopoverAnchor>
      {flatOptions.length > 0 && (
        <PopoverContent
          id={listboxId}
          role="listbox"
          align="start"
          sideOffset={4}
          onOpenAutoFocus={(event) => event.preventDefault()}
          className="z-[150] w-[var(--radix-popover-trigger-width)] max-h-60 overflow-y-auto p-1"
        >
          {flatOptions.map((option, index) => {
            const showGroupLabel =
              option.groupLabel != null && option.groupLabel !== lastGroupLabel;
            lastGroupLabel = option.groupLabel;
            return (
              <div
                key={`${option.suggestion.source}-${option.suggestion.supplier}`}
              >
                {showGroupLabel && (
                  <p className="px-2 pb-1 pt-2 text-xs font-medium text-muted-foreground">
                    {option.groupLabel}
                  </p>
                )}
                <button
                  type="button"
                  role="option"
                  aria-selected={index === highlightedIndex}
                  onMouseEnter={() => setHighlightedIndex(index)}
                  onClick={() => selectOption(option.suggestion.supplier)}
                  className={`flex w-full flex-col items-start rounded-sm px-2 py-2 text-left text-sm ${
                    index === highlightedIndex ? "bg-muted" : ""
                  }`}
                >
                  <span>{option.suggestion.supplier}</span>
                  {option.suggestion.source === "workspace" && (
                    <span className="text-xs text-muted-foreground">
                      {option.suggestion.used_by_count} membro
                      {option.suggestion.used_by_count === 1 ? "" : "s"}
                      {option.suggestion.most_recent_user_name
                        ? ` · ${option.suggestion.most_recent_user_name}`
                        : ""}
                    </span>
                  )}
                </button>
              </div>
            );
          })}
        </PopoverContent>
      )}
    </Popover>
  );
}
