import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { useUIStore } from "@/lib/stores/ui-store";

const pushMock = vi.fn();
const searchParamsMock = {
  get: vi.fn(),
  toString: vi.fn().mockReturnValue(""),
};

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: pushMock }),
  useSearchParams: () => searchParamsMock,
}));

vi.mock("@/lib/http/api-client", async () => {
  const actual = await vi.importActual<typeof import("@/lib/http/api-client")>(
    "@/lib/http/api-client",
  );
  return { ...actual, apiClient: vi.fn() };
});

import { apiClient } from "@/lib/http/api-client";
import { AdminUsersTable, type AdminUser } from "./admin-users-table";

const adminUser: AdminUser = {
  id: "admin-1",
  email: "admin@exemplo.com",
  name: "Admin User",
  role: "admin",
  deleted_at: null,
  created_at: "2026-01-01T00:00:00.000Z",
};

const regularUser: AdminUser = {
  id: "user-1",
  email: "user@exemplo.com",
  name: "Regular User",
  role: null,
  deleted_at: null,
  created_at: "2026-02-01T00:00:00.000Z",
};

const deletedUser: AdminUser = {
  id: "user-2",
  email: "deleted@exemplo.com",
  name: "Deleted User",
  role: null,
  deleted_at: "2026-07-01T00:00:00.000Z",
  created_at: "2026-03-01T00:00:00.000Z",
};

function renderTable() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <AdminUsersTable />
    </QueryClientProvider> as ReactNode,
  );
}

function mockApiResponses(users: AdminUser[]) {
  vi.mocked(apiClient).mockImplementation((url: string) => {
    if (String(url).includes("/users/me")) {
      return Promise.resolve({ id: "admin-1" });
    }
    return Promise.resolve({ data: users, meta: { total: users.length, page: 1, limit: 20 } });
  });
}

beforeEach(() => {
  pushMock.mockClear();
  searchParamsMock.get.mockReset();
  searchParamsMock.get.mockReturnValue(null);
  searchParamsMock.toString.mockReturnValue("");
  useUIStore.setState({ toasts: [] });
  vi.clearAllMocks();
});

afterEach(() => {
  vi.clearAllMocks();
});

describe("AdminUsersTable", () => {
  it("SPEC-20260731-008 RF-15: exibe Skeleton enquanto carrega", () => {
    vi.mocked(apiClient).mockImplementation(() => new Promise(() => {}));

    const { container } = renderTable();

    const skeletons = container.querySelectorAll(".h-10");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("SPEC-20260731-008 RF-16: exibe mensagem de estado vazio quando não há usuários", async () => {
    vi.mocked(apiClient).mockImplementation((url: string) => {
      if (String(url).includes("/users/me")) return Promise.resolve({ id: "admin-1" });
      return Promise.resolve({ data: [], meta: { total: 0, page: 1, limit: 20 } });
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(/Nenhum usuário encontrado/)).toBeInTheDocument();
    });
  });

  it("exibe mensagem de erro quando a busca falha", async () => {
    vi.mocked(apiClient).mockRejectedValue(new Error("Falha"));

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(/Não foi possível carregar os usuários/)).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-10: renderiza colunas da tabela com dados dos usuários", async () => {
    mockApiResponses([regularUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("user@exemplo.com")).toBeInTheDocument();
      expect(screen.getByText("Regular User")).toBeInTheDocument();
    });
  });

  it("exibe '—' para email e nome nulos", async () => {
    mockApiResponses([{ ...regularUser, email: null, name: null }]);

    renderTable();

    await waitFor(() => {
      const dashes = screen.getAllByText("—");
      expect(dashes.length).toBeGreaterThanOrEqual(2);
    });
  });

  it("SPEC-20260731-008 RF-10: exibe badge 'Admin' para usuário admin", async () => {
    mockApiResponses([adminUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("Admin")).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-10: exibe badge 'Usuário' para usuário sem role admin", async () => {
    mockApiResponses([regularUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("Usuário")).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-10: exibe badge de status 'Ativo' para conta não excluída", async () => {
    mockApiResponses([regularUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("Ativo")).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-10: exibe badge 'Pendente de exclusão' para conta com deleted_at", async () => {
    mockApiResponses([deletedUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByText("Pendente de exclusão")).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-10: exibe botão 'Promover a admin' para usuário comum", async () => {
    mockApiResponses([regularUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Promover a admin" })).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-10: exibe botão 'Revogar admin' para usuário admin", async () => {
    mockApiResponses([{ ...adminUser, id: "outro-admin" }]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Revogar admin" })).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-11: botão 'Revogar admin' está desabilitado para o próprio admin autenticado", async () => {
    vi.mocked(apiClient).mockImplementation((url: string) => {
      if (String(url).includes("/users/me")) return Promise.resolve({ id: "admin-1" });
      return Promise.resolve({ data: [adminUser], meta: { total: 1, page: 1, limit: 20 } });
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Revogar admin" })).toBeDisabled();
    });
  });

  it("SPEC-20260731-008 RF-14: promover a admin chama PATCH /admin/users/:id/role", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockImplementation((url: string) => {
      if (String(url).includes("/users/me")) return Promise.resolve({ id: "admin-1" });
      if (String(url).includes("/role")) return Promise.resolve({});
      return Promise.resolve({ data: [regularUser], meta: { total: 1, page: 1, limit: 20 } });
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Promover a admin" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Promover a admin" }));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        `/admin/users/${regularUser.id}/role`,
        expect.objectContaining({ method: "PATCH", body: { role: "admin" } }),
      );
    });
  });

  it("SPEC-20260731-008 RF-14: exibe toast de sucesso após promoção", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockImplementation((url: string) => {
      if (String(url).includes("/users/me")) return Promise.resolve({ id: "admin-1" });
      if (String(url).includes("/role")) return Promise.resolve({});
      return Promise.resolve({ data: [regularUser], meta: { total: 1, page: 1, limit: 20 } });
    });

    renderTable();

    await waitFor(() => expect(screen.getByRole("button", { name: "Promover a admin" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Promover a admin" }));

    await waitFor(() => {
      const toasts = useUIStore.getState().toasts;
      expect(toasts[0]?.title).toBe("Usuário promovido a admin");
    });
  });

  it("exibe toast de erro quando a alteração de role falha", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockImplementation((url: string) => {
      if (String(url).includes("/users/me")) return Promise.resolve({ id: "admin-1" });
      if (String(url).includes("/role")) return Promise.reject(new Error("Falha"));
      return Promise.resolve({ data: [regularUser], meta: { total: 1, page: 1, limit: 20 } });
    });

    renderTable();

    await waitFor(() => expect(screen.getByRole("button", { name: "Promover a admin" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Promover a admin" }));

    await waitFor(() => {
      const toasts = useUIStore.getState().toasts;
      expect(toasts[0]?.variant).toBe("error");
    });
  });

  it("SPEC-20260731-008 US-05: abre o modal de exclusão ao clicar em 'Excluir conta'", async () => {
    const user = userEvent.setup();
    mockApiResponses([regularUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Excluir conta" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Excluir conta" }));

    await waitFor(() => {
      expect(screen.getByText(/Esta ação é irreversível/)).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-10: botão 'Anterior' está desabilitado na primeira página", async () => {
    mockApiResponses([regularUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Anterior" })).toBeDisabled();
    });
  });

  it("SPEC-20260731-008 RF-10: navega para a próxima página ao clicar em 'Próxima'", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockImplementation((url: string) => {
      if (String(url).includes("/users/me")) return Promise.resolve({ id: "admin-1" });
      return Promise.resolve({
        data: Array.from({ length: 20 }, (_, i) => ({ ...regularUser, id: `u${i}`, email: `u${i}@x.com` })),
        meta: { total: 40, page: 1, limit: 20 },
      });
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Próxima" })).not.toBeDisabled();
    });

    await user.click(screen.getByRole("button", { name: "Próxima" }));

    expect(pushMock).toHaveBeenCalledWith(expect.stringContaining("page=2"));
  });

  it("exibe 'usuário' no singular quando há apenas 1 usuário", async () => {
    mockApiResponses([regularUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(/1 usuário\b/)).toBeInTheDocument();
    });
  });

  it("exibe 'usuários' no plural quando há mais de um usuário", async () => {
    mockApiResponses([regularUser, deletedUser]);

    renderTable();

    await waitFor(() => {
      expect(screen.getByText(/2 usuários/)).toBeInTheDocument();
    });
  });

  it("SPEC-20260731-008 RF-14: revogar admin chama PATCH com role null", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockImplementation((url: string) => {
      if (String(url).includes("/users/me")) return Promise.resolve({ id: "admin-1" });
      if (String(url).includes("/role")) return Promise.resolve({});
      return Promise.resolve({ data: [{ ...adminUser, id: "outro-admin" }], meta: { total: 1, page: 1, limit: 20 } });
    });

    renderTable();

    await waitFor(() => {
      expect(screen.getByRole("button", { name: "Revogar admin" })).toBeInTheDocument();
    });

    await user.click(screen.getByRole("button", { name: "Revogar admin" }));

    await waitFor(() => {
      expect(apiClient).toHaveBeenCalledWith(
        "/admin/users/outro-admin/role",
        expect.objectContaining({ method: "PATCH", body: { role: null } }),
      );
    });
  });

  it("SPEC-20260731-008 RF-14: exibe toast 'Role de admin revogado' após revogar com sucesso", async () => {
    const user = userEvent.setup();
    vi.mocked(apiClient).mockImplementation((url: string) => {
      if (String(url).includes("/users/me")) return Promise.resolve({ id: "admin-1" });
      if (String(url).includes("/role")) return Promise.resolve({});
      return Promise.resolve({ data: [{ ...adminUser, id: "outro-admin" }], meta: { total: 1, page: 1, limit: 20 } });
    });

    renderTable();

    await waitFor(() => expect(screen.getByRole("button", { name: "Revogar admin" })).toBeInTheDocument());

    await user.click(screen.getByRole("button", { name: "Revogar admin" }));

    await waitFor(() => {
      const toasts = useUIStore.getState().toasts;
      expect(toasts[0]?.title).toBe("Role de admin revogado");
    });
  });
});
