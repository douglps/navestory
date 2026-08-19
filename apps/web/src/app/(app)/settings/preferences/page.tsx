"use client";

import {
  CHIP_FIELDS,
  DEFAULT_CHIP_FIELDS,
  DEFAULT_DASHBOARD_KPI_IDS,
  DEFAULT_SPENDING_WINDOW_DAYS,
  MAX_ACTIVE_DASHBOARD_KPIS,
  SPENDING_WINDOW_DAYS_OPTIONS,
  chipFieldsSchema,
  spendingWindowDaysSchema,
  timezoneSchema,
  updatePreferencesInputSchema,
  type ChipField,
  type ContextType,
  type KpiCatalogId,
  type SpendingWindowDays,
  type UpdatePreferencesInput,
} from "@navestory/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Alert, Button, Checkbox, Container, Input } from "@navestory/ui";
import { apiClient } from "@/lib/http/api-client";
import { KpiPicker } from "@/components/dashboard/KpiPicker";
import type {
  VehicleGroupSummary,
  VehicleSummary,
} from "@/lib/context/use-vehicle-context";
import { formatChipPreview } from "@/lib/vehicle-chip";

interface UserPreferencesResponse {
  auto_draft_enabled: boolean;
  vehicle_chip_fields?: ChipField[];
  timezone?: string | null;
  /** @spec SPEC-20260804-001 RF-06 */
  spending_window_days?: SpendingWindowDays;
  /** @spec SPEC-20260804-002 RF-06 */
  default_context_type?: ContextType | null;
  default_context_id?: string | null;
  /** @spec SPEC-20260721-002 RF-01 */
  dashboard_kpi_ids?: KpiCatalogId[];
}

/** @spec SPEC-20260804-002 RF-07 */
const CONTEXT_TYPE_LABELS: Record<ContextType, string> = {
  all: "Toda a frota",
  single: "Veículo específico",
  group: "Grupo específico",
};

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

  /** @spec SPEC-20260804-001 RF-05 */
  const [spendingWindowDays, setSpendingWindowDays] =
    useState<SpendingWindowDays>(DEFAULT_SPENDING_WINDOW_DAYS);
  const [isWindowDirty, setIsWindowDirty] = useState(false);
  const [windowSaveState, setWindowSaveState] = useState<"idle" | "saved">(
    "idle",
  );

  /** @spec SPEC-20260804-002 RF-07 */
  const [contextType, setContextType] = useState<ContextType>("all");
  const [contextEntityId, setContextEntityId] = useState<string>("");
  const [isContextDirty, setIsContextDirty] = useState(false);
  const [contextSaveState, setContextSaveState] = useState<"idle" | "saved">(
    "idle",
  );
  const [contextError, setContextError] = useState<string | null>(null);

  useEffect(() => {
    if (preferences) {
      setAutoDraftEnabled(preferences.auto_draft_enabled);
      setIsDraftDirty(false);
      setChipFields(preferences.vehicle_chip_fields ?? DEFAULT_CHIP_FIELDS);
      setIsChipDirty(false);
      setTimezone(preferences.timezone ?? "");
      setIsTzDirty(false);
      setSpendingWindowDays(
        preferences.spending_window_days ?? DEFAULT_SPENDING_WINDOW_DAYS,
      );
      setIsWindowDirty(false);
      setContextType(preferences.default_context_type ?? "all");
      setContextEntityId(preferences.default_context_id ?? "");
      setIsContextDirty(false);
    }
  }, [preferences]);

  /**
   * @spec SPEC-20260804-002 RF-07, RF-08 — listas para o seletor de entidade, buscadas quando o
   * tipo em edição exige (RF-07) ou quando a preferência já salva aponta para esse tipo, para o
   * aviso de entidade removida (RF-08) funcionar mesmo que o usuário esteja editando outro tipo.
   */
  const { data: vehicles } = useQuery({
    queryKey: ["vehicles"],
    queryFn: () => apiClient<VehicleSummary[]>("/vehicles"),
    enabled:
      contextType === "single" ||
      preferences?.default_context_type === "single",
    retry: false,
    staleTime: 60_000,
  });
  const { data: groups } = useQuery({
    queryKey: ["vehicle-groups"],
    queryFn: () => apiClient<VehicleGroupSummary[]>("/vehicle-groups"),
    enabled:
      contextType === "group" ||
      preferences?.default_context_type === "group",
    retry: false,
    staleTime: 60_000,
  });

  /** @spec SPEC-20260804-002 RF-08 — aviso quando a entidade salva como padrão foi removida */
  const savedContextMissing =
    !!preferences?.default_context_id &&
    preferences.default_context_type === "single"
      ? vehicles !== undefined &&
        !vehicles.some((v) => v.id === preferences.default_context_id)
      : !!preferences?.default_context_id &&
          preferences.default_context_type === "group"
        ? groups !== undefined &&
          !groups.some((g) => g.id === preferences.default_context_id)
        : false;

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

  /** @spec SPEC-20260804-001 RF-05 */
  function handleChangeWindow(days: SpendingWindowDays): void {
    setSpendingWindowDays(days);
    setIsWindowDirty(true);
    setWindowSaveState("idle");
  }

  function handleSaveWindow(): void {
    const result = spendingWindowDaysSchema.safeParse(spendingWindowDays);
    if (!result.success) return;
    mutation.mutate(
      { spending_window_days: result.data },
      {
        onSuccess: () => {
          setIsWindowDirty(false);
          setWindowSaveState("saved");
        },
      },
    );
  }

  function handleCancelWindow(): void {
    setSpendingWindowDays(
      preferences?.spending_window_days ?? DEFAULT_SPENDING_WINDOW_DAYS,
    );
    setIsWindowDirty(false);
    setWindowSaveState("idle");
  }

  /** @spec SPEC-20260804-002 RF-07 */
  function handleChangeContextType(type: ContextType): void {
    setContextType(type);
    setContextEntityId("");
    setIsContextDirty(true);
    setContextSaveState("idle");
    setContextError(null);
  }

  function handleChangeContextEntity(id: string): void {
    setContextEntityId(id);
    setIsContextDirty(true);
    setContextSaveState("idle");
    setContextError(null);
  }

  function handleSaveContext(): void {
    if (contextType !== "all" && !contextEntityId) {
      setContextError(
        contextType === "single"
          ? "Selecione um veículo"
          : "Selecione um grupo",
      );
      return;
    }
    const result = updatePreferencesInputSchema.safeParse({
      default_context_type: contextType,
      default_context_id: contextType === "all" ? null : contextEntityId,
    });
    if (!result.success) {
      setContextError(result.error.issues[0]?.message ?? "Seleção inválida");
      return;
    }
    setContextError(null);
    mutation.mutate(result.data, {
      onSuccess: () => {
        setIsContextDirty(false);
        setContextSaveState("saved");
      },
    });
  }

  function handleCancelContext(): void {
    setContextType(preferences?.default_context_type ?? "all");
    setContextEntityId(preferences?.default_context_id ?? "");
    setIsContextDirty(false);
    setContextSaveState("idle");
    setContextError(null);
  }

  if (isLoading) return <main className="p-8">Carregando…</main>;
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
          Preserva o que você digitou em formulários caso a aba seja fechada ou a
          sessão expire antes de você salvar.
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
          {draftSaveState === "saved" && !isDraftDirty && <Alert variant="success" description="Salvo." />}
        </div>
      </section>

      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Exibição do veículo</h2>
        <p className="text-sm text-muted-foreground">
          Escolha quais campos aparecem na barra de identificação do veículo no
          topo do app. A placa é sempre exibida.
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
          {chipSaveState === "saved" && !isChipDirty && <Alert variant="success" description="Salvo." />}
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
          {tzSaveState === "saved" && !isTzDirty && <Alert variant="success" description="Salvo." />}
        </div>
      </section>

      {/* @spec SPEC-20260813-001 RF-20 — ponto de entrada movido do dashboard para cá; mesma
          mutation ["preferences"] PATCH dashboard_kpi_ids já usada pelo KpiPicker. */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Indicadores exibidos no dashboard</h2>
        <p className="text-sm text-muted-foreground">
          Escolha quais KPIs aparecem no topo do dashboard (até{" "}
          {MAX_ACTIVE_DASHBOARD_KPIS} simultâneos).
        </p>
        <div>
          <KpiPicker
            activeIds={preferences?.dashboard_kpi_ids ?? DEFAULT_DASHBOARD_KPI_IDS}
          />
        </div>
      </section>

      {/* @spec SPEC-20260804-001 RF-05 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Período para &quot;Gastos recentes&quot;</h2>
        <p className="text-sm text-muted-foreground">
          Quantos dias o dashboard considera ao calcular &quot;Gastos
          recentes&quot;.
        </p>

        <div className="flex items-center gap-2" role="radiogroup" aria-label="Janela do KPI de gastos recentes">
          {SPENDING_WINDOW_DAYS_OPTIONS.map((days) => (
            <Button
              key={days}
              type="button"
              variant={spendingWindowDays === days ? "default" : "outline"}
              size="sm"
              role="radio"
              aria-checked={spendingWindowDays === days}
              onClick={() => handleChangeWindow(days)}
            >
              {days} dias
            </Button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSaveWindow}
            disabled={!isWindowDirty || mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelWindow}
            disabled={!isWindowDirty}
          >
            Cancelar
          </Button>
          {windowSaveState === "saved" && !isWindowDirty && (
            <Alert variant="success" description="Salvo." />
          )}
        </div>
      </section>

      {/* @spec SPEC-20260804-002 RF-07, RF-08 */}
      <section className="flex flex-col gap-3">
        <h2 className="text-lg font-medium">Contexto padrão</h2>
        <p className="text-sm text-muted-foreground">
          O que o chip do header mostra automaticamente ao iniciar uma nova
          sessão (login ou aba nova). Não afeta abas já abertas.
        </p>

        {savedContextMissing && (
          <Alert
            variant="warning"
            description={`O ${preferences?.default_context_type === "single" ? "veículo" : "grupo"} padrão foi removido. Selecione outro ou escolha "Toda a frota".`}
          />
        )}

        <div className="flex flex-col gap-1">
          {(["all", "single", "group"] as const).map((type) => (
            <label key={type} className="flex items-center gap-2">
              <input
                type="radio"
                name="default-context-type"
                checked={contextType === type}
                onChange={() => handleChangeContextType(type)}
              />
              {/* eslint-disable-next-line security/detect-object-injection -- type é ContextType, união fixa de 3 literais */}
              {CONTEXT_TYPE_LABELS[type]}
            </label>
          ))}
        </div>

        {contextType === "single" && (
          <select
            aria-label="Selecionar veículo padrão"
            value={contextEntityId}
            onChange={(event) => handleChangeContextEntity(event.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="">Selecione um veículo</option>
            {(vehicles ?? []).map((vehicle) => (
              <option key={vehicle.id} value={vehicle.id}>
                {vehicle.plate} · {vehicle.model ?? vehicle.make ?? ""}
              </option>
            ))}
          </select>
        )}

        {contextType === "group" && (
          <select
            aria-label="Selecionar grupo padrão"
            value={contextEntityId}
            onChange={(event) => handleChangeContextEntity(event.target.value)}
            className="rounded-md border border-border px-3 py-2 text-sm"
          >
            <option value="">Selecione um grupo</option>
            {(groups ?? []).map((group) => (
              <option key={group.id} value={group.id}>
                {group.name} · {group.member_count} membros
              </option>
            ))}
          </select>
        )}

        {contextError && <Alert variant="error" description={contextError} />}

        <div className="flex items-center gap-2">
          <Button
            type="button"
            onClick={handleSaveContext}
            disabled={!isContextDirty || mutation.isPending}
          >
            {mutation.isPending ? "Salvando..." : "Salvar"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleCancelContext}
            disabled={!isContextDirty}
          >
            Cancelar
          </Button>
          {contextSaveState === "saved" && !isContextDirty && (
            <Alert variant="success" description="Salvo." />
          )}
        </div>
      </section>
    </Container>
  );
}
