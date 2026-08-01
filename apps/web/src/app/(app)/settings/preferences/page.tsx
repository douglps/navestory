"use client";

import {
  CHIP_FIELDS,
  DEFAULT_CHIP_FIELDS,
  chipFieldsSchema,
  timezoneSchema,
  updatePreferencesInputSchema,
  type ChipField,
  type UpdatePreferencesInput,
} from "@navestory/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Button, Checkbox, Container, Input } from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import { formatChipPreview } from "@/lib/vehicle-chip";

interface UserPreferencesResponse {
  auto_draft_enabled: boolean;
  vehicle_chip_fields?: ChipField[];
  timezone?: string | null;
}

/** @spec SPEC-20260715-002 RF-FE-06 — fusos IANA do Brasil obrigatórios no seletor */
const BRAZIL_TIMEZONES = [
  "America/Sao_Paulo",
  "America/Manaus",
  "America/Belem",
  "America/Fortaleza",
  "America/Recife",
  "America/Porto_Velho",
  "America/Boa_Vista",
  "America/Rio_Branco",
  "America/Noronha",
] as const;

const CHIP_FIELD_LABELS: Record<ChipField, string> = {
  plate: "Placa",
  make: "Marca",
  model: "Modelo",
  nickname: "Apelido",
};

const OPTIONAL_CHIP_FIELDS = CHIP_FIELDS.filter((field) => field !== "plate");

/** @spec SPEC-20260603-003 RNF-03 — veículo de exemplo para a prévia em tempo real */
const PREVIEW_VEHICLE = {
  make: "Toyota",
  model: "Corolla",
  plate: "ABC1D23",
  nickname: "Branquinho",
};

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

function moveField(
  fields: ChipField[],
  index: number,
  direction: -1 | 1,
): ChipField[] {
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

  const {
    data: preferences,
    isLoading,
    isError,
  } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient<UserPreferencesResponse>("/preferences"),
    retry: false,
  });

  const [autoDraftEnabled, setAutoDraftEnabled] = useState(false);
  const [isDraftDirty, setIsDraftDirty] = useState(false);
  const [draftSaveState, setDraftSaveState] = useState<"idle" | "saved">(
    "idle",
  );

  const [chipFields, setChipFields] =
    useState<ChipField[]>(DEFAULT_CHIP_FIELDS);
  const [isChipDirty, setIsChipDirty] = useState(false);
  const [chipSaveState, setChipSaveState] = useState<"idle" | "saved">("idle");
  const [chipError, setChipError] = useState<string | null>(null);

  const [timezone, setTimezone] = useState<string>("");
  const [isTzDirty, setIsTzDirty] = useState(false);
  const [tzSaveState, setTzSaveState] = useState<"idle" | "saved">("idle");
  const [tzError, setTzError] = useState<string | null>(null);

  useEffect(() => {
    if (preferences) {
      setAutoDraftEnabled(preferences.auto_draft_enabled);
      setIsDraftDirty(false);
      setChipFields(preferences.vehicle_chip_fields ?? DEFAULT_CHIP_FIELDS);
      setIsChipDirty(false);
      setTimezone(preferences.timezone ?? "");
      setIsTzDirty(false);
    }
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: (input: UpdatePreferencesInput) =>
      apiClient<UserPreferencesResponse>("/preferences", {
        method: "PATCH",
        body: input,
      }),
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
    const result = updatePreferencesInputSchema.safeParse({
      auto_draft_enabled: autoDraftEnabled,
    });
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
      const next = checked
        ? [...current, field]
        : current.filter((f) => f !== field);
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

  function handleTimezoneChange(value: string): void {
    setTimezone(value);
    setIsTzDirty(true);
    setTzSaveState("idle");
    setTzError(null);
  }

  /** @spec SPEC-20260715-002 RF-FE-02 */
  function handleSaveTimezone(): void {
    const result = timezoneSchema.safeParse(timezone);
    if (!result.success) {
      setTzError(result.error.issues[0]?.message ?? "Fuso horário inválido");
      return;
    }
    setTzError(null);
    mutation.mutate(
      { timezone: result.data },
      {
        onSuccess: () => {
          setIsTzDirty(false);
          setTzSaveState("saved");
        },
      },
    );
  }

  function handleCancelTimezone(): void {
    setTimezone(preferences?.timezone ?? "");
    setIsTzDirty(false);
    setTzSaveState("idle");
    setTzError(null);
  }

  if (isLoading) return <main className="p-8">Carregando...</main>;
  if (isError)
    return (
      <main className="p-8">
        <Alert
          variant="error"
          description="Não foi possível carregar as preferências."
        />
      </main>
    );

  return (
    <Container size="2xl" gap={8}>
      <h1 className="text-xl font-semibold">Preferências</h1>

      {mutation.isError && (
        <Alert
          variant="error"
          description="Não foi possível salvar as preferências."
        />
      )}

      <section className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <Checkbox
            checked={autoDraftEnabled}
            onChange={(event) => handleToggleDraft(event.target.checked)}
          />
          Rascunho automático
        </label>
        <p className="text-sm text-muted-foreground">
          Salva automaticamente os dados não enviados de formulários ao fechar a
          aba ou expirar a sessão.
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSaveDraft}
            disabled={!isDraftDirty || mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelDraft}
            disabled={!isDraftDirty}
          >
            Cancelar
          </Button>
          {draftSaveState === "saved" && !isDraftDirty && <span>✓ Salvo</span>}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Exibição do veículo</h2>
        <p className="text-sm text-muted-foreground">
          Escolha quais campos aparecem no chip de contexto do veículo. A placa
          é sempre exibida.
        </p>

        <div className="flex flex-col gap-1">
          <label className="flex items-center gap-2 text-muted-foreground">
            <Checkbox checked disabled />
            Placa (obrigatório)
          </label>
          {OPTIONAL_CHIP_FIELDS.map((field) => (
            <label key={field} className="flex items-center gap-2">
              <Checkbox
                checked={chipFields.includes(field)}
                onChange={(event) =>
                  handleToggleChipField(field, event.target.checked)
                }
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
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Mover ${chipFieldLabel(field)} para cima`}
                  onClick={() => handleMoveChipField(index, -1)}
                  disabled={index === 0}
                >
                  ↑
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  aria-label={`Mover ${chipFieldLabel(field)} para baixo`}
                  onClick={() => handleMoveChipField(index, 1)}
                  disabled={index === chipFields.length - 1}
                >
                  ↓
                </Button>
              </li>
            ))}
          </ul>
        </div>

        <div
          className="rounded-md border border-border px-3 py-2"
          data-testid="chip-preview"
        >
          <span className="text-xs text-muted-foreground">Prévia:</span>{" "}
          {formatChipPreview(chipFields, PREVIEW_VEHICLE)}
        </div>

        {chipError && <Alert variant="error" description={chipError} />}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSaveChipFields}
            disabled={!isChipDirty || mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelChipFields}
            disabled={!isChipDirty}
          >
            Cancelar
          </Button>
          {chipSaveState === "saved" && !isChipDirty && <span>✓ Salvo</span>}
        </div>
      </section>

      {/* @spec SPEC-20260715-002 RF-FE-02, RF-FE-06 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Fuso horário</h2>
        <p className="text-sm text-muted-foreground">
          Usado para calcular &quot;hoje&quot; em alertas e KPIs, e para
          preencher a hora atual em novos lançamentos.
        </p>

        <span className="text-sm">
          Atual:{" "}
          <strong>{preferences?.timezone ?? "Não detectado ainda"}</strong>
        </span>

        <label htmlFor="timezone">Selecionar fuso</label>
        <Input
          id="timezone"
          list="timezone-options"
          value={timezone}
          onChange={(event) => handleTimezoneChange(event.target.value)}
          placeholder="America/Sao_Paulo"
        />
        <datalist id="timezone-options">
          {BRAZIL_TIMEZONES.map((tz) => (
            <option key={tz} value={tz} />
          ))}
        </datalist>

        {tzError && <Alert variant="error" description={tzError} />}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSaveTimezone}
            disabled={!isTzDirty || mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelTimezone}
            disabled={!isTzDirty}
          >
            Cancelar
          </Button>
          {tzSaveState === "saved" && !isTzDirty && <span>✓ Salvo</span>}
        </div>
      </section>
    </Container>
  );
}
