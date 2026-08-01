import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "@/lib/stores/ui-store";

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";
import { DeleteUserDialog } from "./delete-user-dialog";

function renderDialog(props: {
  userId?: string;
  email?: string | null;
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onDeleted?: () => void;
}) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <DeleteUserDialog
        userId={props.userId ?? "user-123"}
        email={"email" in props ? (props.email as string | null) : "test@example.com"}
        open={props.open ?? true}
        onOpenChange={props.onOpenChange ?? vi.fn()}
        onDeleted={props.onDeleted ?? vi.fn()}
      />
    </QueryClientProvider> as ReactNode,
  );
}

beforeEach(() => {
  useUIStore.setState({ toasts: [] });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("DeleteUserDialog", () => {
  it("SPEC-20260731-008 US-05: exibe o email do usuário no título do diálogo", () => {
    renderDialog({ email: "usuario@exemplo.com" });

    expect(screen.getByRole("heading", { name: /usuario@exemplo.com/ })).toBeInTheDocument();
  });

  it("SPEC-20260731-008 US-05: exibe o userId quando email é null", async () => {
    renderDialog({ userId: "abc-123", email: null });

    const heading = await screen.findByRole("heading");
    expect(heading.textContent).toContain("abc-123");
  });

  it("SPEC-20260731-008 US-05: exibe mensagem de confirmação irreversível", () => {
    renderDialog({});

    expect(screen.getByText(/Esta ação é irreversível/)).toBeInTheDocument();
  });

  it("SPEC-20260731-008 US-05: exibe botões 'Cancelar' e 'Confirmar exclusão'", () => {
    renderDialog({});

    expect(screen.getByRole("button", { name: "Cancelar" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Confirmar exclusão" })).toBeInTheDocument();
  });

  it("SPEC-20260731-008 US-05: cancelar chama onOpenChange(false) sem executar DELETE", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();

    renderDialog({ onOpenChange: onOpenChangeMock });

    await user.click(screen.getByRole("button", { name: "Cancelar" }));

    expect(onOpenChangeMock).toHaveBeenCalledWith(false);
    expect(apiClient).not.toHaveBeenCalled();
  });

  it("SPEC-20260731-008 US-05: confirmar exclusão chama DELETE /admin/users/:id", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockResolvedValue(undefined);

    renderDialog({ userId: "user-456" });

    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        "/admin/users/user-456",
        expect.objectContaining({ method: "DELETE" }),
      );
    });
  });

  it("SPEC-20260731-008 US-05: após exclusão bem-sucedida, fecha o diálogo e exibe toast de sucesso", async () => {
    const user = userEvent.setup();
    const onOpenChangeMock = vi.fn();
    const onDeletedMock = vi.fn();
    vi.mocked(apiClient).mockResolvedValue(undefined);

    renderDialog({ onOpenChange: onOpenChangeMock, onDeleted: onDeletedMock });

    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => {
      expect(onOpenChangeMock).toHaveBeenCalledWith(false);
      expect(onDeletedMock).toHaveBeenCalledTimes(1);
    });

    const toasts = useUIStore.getState().toasts;
    expect(toasts[0]?.variant).toBe("success");
    expect(toasts[0]?.title).toBe("Conta excluída com sucesso");
  });

  it("exibe toast de erro quando a exclusão falha", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockRejectedValue(new Error("Falha na API"));

    renderDialog({});

    await user.click(screen.getByRole("button", { name: "Confirmar exclusão" }));

    await waitFor(() => {
      const toasts = useUIStore.getState().toasts;
      expect(toasts[0]?.variant).toBe("error");
      expect(toasts[0]?.title).toBe("Não foi possível excluir a conta");
    });
  });

  it("não renderiza nada quando open é false", () => {
    renderDialog({ open: false });

    expect(screen.queryByText(/Esta ação é irreversível/)).not.toBeInTheDocument();
  });
});
