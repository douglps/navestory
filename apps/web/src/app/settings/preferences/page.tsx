"use client";

import {
  CHIP_FIELDS,
  DEFAULT_CHIP_FIELDS,
  chipFieldsSchema,
  updatePreferencesInputSchema,
  type ChipField,
  type UpdatePreferencesInput,
} from "@nave/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";
import { formatChipPreview } from "@/lib/vehicle-chip";

interface UserPreferencesResponse {
  auto_draft_enabled: boolean;
  vehicle_chip_fields?: ChipField[];
}

const CHIP_FIELD_LABELS: Record<ChipField, string> = {
  plate: "Placa",
  make: "Marca",
  model: "Modelo",
  nickname: "Apelido",
};

const OPTIONAL_CHIP_FIELDS = CHIP_FIELDS.filter((field) => field !== "plate");

/** @spec SPEC-20260603-003 RNF-03 — veículo de exemplo para a prévia em tempo real */
const PREVIEW_VEHICLE = { make: "Toyota", model: "Corolla", plate: "ABC1D23", nickname: "Branquinho" };

function chipFieldLabel(field: ChipField): string {
  switch (field) {
    case "plate":
      return CHIP_FIELD_LABELS.plate;
    case "make":
      return CHIP_FIELD_LABELS.make;
    case "model":
      return CHIP_FIELD_LABELS.model;
    case "nickname":
      return CHIP_FIELD_LABELS.nickname;
  }
}

function moveField(fields: ChipField[], index: number, direction: -1 | 1): ChipField[] {
  const target = index + direction;
  if (target < 0 || target >= fields.length) return fields;
  /* eslint-disable security/detect-object-injection -- index/target são bounds-checked acima */
  const fieldAtIndex = fields[index]!;
  const fieldAtTarget = fields[target]!;
  /* eslint-enable security/detect-object-injection */
  return fields.map((field, i) => {
    if (i === index) return fieldAtTarget;
    if (i === target) return fieldAtIndex;
    return field;
  });
}

/**
 * @spec SPEC-20260612-003 RF-02
 * @spec SPEC-20260603-003 RF-07/RNF-03
 */
export default function PreferencesPage(): ReactNode {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, isError } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient<UserPreferencesResponse>("/preferences"),
    retry: false,
  });

  const [autoDraftEnabled, setAutoDraftEnabled] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saved">("idle");

  const [chipFields, setChipFields] = useState<ChipField[]>(DEFAULT_CHIP_FIELDS);
  const [isChipDirty, setIsChipDirty] = useState(false);
  const [chipSaveState, setChipSaveState] = useState<"idle" | "saved">("idle");
  const [chipError, setChipError] = useState<string | null>(null);

  useEffect(() => {
    if (preferences) {
      setAutoDraftEnabled(preferences.auto_draft_enabled);
      setIsDraftDirty(false);
      setChipFields(preferences.vehicle_chip_fields ?? DEFAULT_CHIP_FIELDS);
      setIsChipDirty(false);
    }
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: (input: UpdatePreferencesInput) =>
      apiClient<UserPreferencesResponse>("/preferences", { method: "PATCH", body: input }),
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data);
    },
  });

  function handleToggleDraft(checked: boolean): void {
    setAutoDraftEnabled(checked);
    setIsDraftDirty(true);
    setDraftSaveState("idle");
  }

  function handleSaveDraft(): void {
    const result = updatePreferencesInputSchema.safeParse({ auto_draft_enabled: autoDraftEnabled });
    if (!result.success) return;
    mutation.mutate(result.data, {
      onSuccess: () => {
        setIsDraftDirty(false);
        setDraftSaveState("saved");
      },
    });
  }

  function handleCancelDraft(): void {
    if (preferences) {
      setAutoDraftEnabled(preferences.auto_draft_enabled);
    }
    setIsDraftDirty(false);
    setDraftSaveState("idle");
  }

  function handleToggleChipField(field: ChipField, checked: boolean): void {
    setChipError(null);
    setChipFields((current) => {
      const next = checked ? [...current, field] : current.filter((f) => f !== field);
      return next;
    });
    setIsChipDirty(true);
    setChipSaveState("idle");
  }

  function handleMoveChipField(index: number, direction: -1 | 1): void {
    setChipFields((current) => moveField(current, index, direction));
    setIsChipDirty(true);
    setChipSaveState("idle");
  }

  function handleSaveChipFields(): void {
    const result = chipFieldsSchema.safeParse(chipFields);
    if (!result.success) {
      setChipError(result.error.issues[0]?.message ?? "Configuração inválida");
      return;
    }
    setChipError(null);
    mutation.mutate(
      { vehicle_chip_fields: result.data },
      {
        onSuccess: () => {
          setIsChipDirty(false);
          setChipSaveState("saved");
        },
      },
    );
  }

  function handleCancelChipFields(): void {
    setChipFields(preferences?.vehicle_chip_fields ?? DEFAULT_CHIP_FIELDS);
    setIsChipDirty(false);
    setChipSaveState("idle");
    setChipError(null);
  }

  if (isLoading) return <main className="p-8">Carregando...</main>;
  if (isError) return <main className="p-8" role="alert">Não foi possível carregar as preferências.</main>;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-8 p-8">
      <h1 className="text-xl font-semibold">Preferências</h1>

      {mutation.isError && <p role="alert">Não foi possível salvar as preferências.</p>}

      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoDraftEnabled}
            onChange={(event) => handleToggleDraft(event.target.checked)}
          />
          Rascunho automático
        </label>
        <p className="text-sm text-muted-foreground">
          Salva automaticamente os dados não enviados de formulários ao fechar a aba ou expirar a
          sessão.
        </p>

        <div className="flex items-center gap-2">
          <button type="button" onClick={handleSaveDraft} disabled={!isDraftDirty || mutation.isPending}>
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" onClick={handleCancelDraft} disabled={!isDraftDirty}>
            Cancelar
          </button>
          {draftSaveState === "saved" && !isDraftDirty && <span>✓ Salvo</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Exibição do veículo</h2>
        <p className="text-sm text-muted-foreground">
          Escolha quais campos aparecem no chip de contexto do veículo. A placa é sempre exibida.
        </p>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-muted-foreground">
            <input type="checkbox" checked disabled />
            Placa (obrigatório)
          </label>
          {OPTIONAL_CHIP_FIELDS.map((field) => (
            <label key={field} className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={chipFields.includes(field)}
                onChange={(event) => handleToggleChipField(field, event.target.checked)}
              />
              {chipFieldLabel(field)}
            </label>
          ))}
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-sm font-medium">Ordem no chip</span>
          <ul className="flex flex-col gap-1">
            {chipFields.map((field, index) => (
              <li key={field} className="flex items-center gap-2">
                <span>{chipFieldLabel(field)}</span>
                <button
                  type="button"
                  aria-label={`Mover ${chipFieldLabel(field)} para cima`}
                  onClick={() => handleMoveChipField(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </button>
                <button
                  type="button"
                  aria-label={`Mover ${chipFieldLabel(field)} para baixo`}
                  onClick={() => handleMoveChipField(index, 1)}
                  disabled={index === chipFields.length - 1}
                >
                  ↓
                </button>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded border px-3 py-2" data-testid="chip-preview">
          <span className="text-xs text-muted-foreground">Prévia:</span>{" "}
          {formatChipPreview(chipFields, PREVIEW_VEHICLE)}
        </div>

        {chipError && <p role="alert">{chipError}</p>}

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleSaveChipFields}
            disabled={!isChipDirty || mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </button>
          <button type="button" onClick={handleCancelChipFields} disabled={!isChipDirty}>
            Cancelar
          </button>
          {chipSaveState === "saved" && !isChipDirty && <span>✓ Salvo</span>}
        </div>
      </section>
    </main>
  );
}
