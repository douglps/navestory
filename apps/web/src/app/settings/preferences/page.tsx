"use client";

import { updatePreferencesInputSchema } from "@nave/validators";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { apiClient } from "@/lib/http/api-client";

interface UserPreferencesResponse {
  auto_draft_enabled: boolean;
}

/**
 * @spec SPEC-20260612-003 RF-02
 */
export default function PreferencesPage(): ReactNode {
  const queryClient = useQueryClient();

  const { data: preferences, isLoading, isError } = useQuery({
    queryKey: ["preferences"],
    queryFn: () => apiClient<UserPreferencesResponse>("/preferences"),
    retry: false,
  });

  const [autoDraftEnabled, setAutoDraftEnabled] = useState(false);
  const [isDirty, setIsDirty] = useState(false);
  const [saveState, setSaveState] = useState<"idle" | "saved">("idle");

  useEffect(() => {
    if (preferences) {
      setAutoDraftEnabled(preferences.auto_draft_enabled);
      setIsDirty(false);
    }
  }, [preferences]);

  const mutation = useMutation({
    mutationFn: (input: { auto_draft_enabled: boolean }) =>
      apiClient<UserPreferencesResponse>("/preferences", { method: "PATCH", body: input }),
    onSuccess: (data) => {
      queryClient.setQueryData(["preferences"], data);
      setIsDirty(false);
      setSaveState("saved");
    },
  });

  function handleToggle(checked: boolean): void {
    setAutoDraftEnabled(checked);
    setIsDirty(true);
    setSaveState("idle");
  }

  function handleSave(): void {
    const result = updatePreferencesInputSchema.safeParse({ auto_draft_enabled: autoDraftEnabled });
    if (!result.success) return;
    mutation.mutate(result.data);
  }

  function handleCancel(): void {
    if (preferences) {
      setAutoDraftEnabled(preferences.auto_draft_enabled);
    }
    setIsDirty(false);
    setSaveState("idle");
  }

  if (isLoading) return <main className="p-8">Carregando...</main>;
  if (isError) return <main className="p-8" role="alert">Não foi possível carregar as preferências.</main>;

  return (
    <main className="mx-auto flex max-w-2xl flex-col gap-4 p-8">
      <h1 className="text-xl font-semibold">Preferências</h1>

      <div className="flex flex-col gap-2">
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={autoDraftEnabled}
            onChange={(event) => handleToggle(event.target.checked)}
          />
          Rascunho automático
        </label>
        <p className="text-sm text-muted-foreground">
          Salva automaticamente os dados não enviados de formulários ao fechar a aba ou expirar a
          sessão.
        </p>
      </div>

      {mutation.isError && <p role="alert">Não foi possível salvar as preferências.</p>}

      <div className="flex items-center gap-2">
        <button type="button" onClick={handleSave} disabled={!isDirty || mutation.isPending}>
          {mutation.isPending ? "Salvando..." : "Salvar"}
        </button>
        <button type="button" onClick={handleCancel} disabled={!isDirty}>
          Cancelar
        </button>
        {saveState === "saved" && !isDirty && <span>✓ Salvo</span>}
      </div>
    </main>
  );
}
